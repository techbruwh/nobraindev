use anyhow::{Context, Result};
use ndarray::{Array, Axis};
use ort::session::Session;
use std::cell::RefCell;
use std::path::PathBuf;
use std::sync::Arc;
use tokenizers::Tokenizer;

use crate::models::{SearchResult, Snippet};

const MODEL_NAME: &str = "all-MiniLM-L6-v2";
const EMBEDDING_DIM: usize = 384;

pub struct SearchEngine {
    session: RefCell<Session>,
    tokenizer: Arc<Tokenizer>,
}

impl SearchEngine {
    pub fn new(model_path: PathBuf, tokenizer_path: PathBuf) -> Result<Self> {
        // Load ONNX model
        let session = Session::builder()?
            .commit_from_file(&model_path)
            .context("Failed to load ONNX model")?;

        // Load tokenizer
        let tokenizer = Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| anyhow::anyhow!("Failed to load tokenizer: {}", e))?;

        Ok(SearchEngine {
            session: RefCell::new(session),
            tokenizer: Arc::new(tokenizer),
        })
    }

    pub fn is_loaded(&self) -> bool {
        true
    }

    /// Generate embeddings for a given text
    pub fn generate_embedding(&self, text: &str) -> Result<Vec<f32>> {
        // Tokenize text
        let encoding = self
            .tokenizer
            .encode(text, false)
            .map_err(|e| anyhow::anyhow!("Tokenization failed: {}", e))?;

        let input_ids = encoding.get_ids();
        let attention_mask = encoding.get_attention_mask();

        // Convert to i64 arrays
        let input_ids: Vec<i64> = input_ids.iter().map(|&id| id as i64).collect();
        let attention_mask: Vec<i64> = attention_mask.iter().map(|&m| m as i64).collect();

        let seq_length = input_ids.len();

        // Create token_type_ids (all zeros for single sentence)
        let token_type_ids: Vec<i64> = vec![0; seq_length];

        // Create input arrays (clone before moving)
        let input_ids_array = Array::from_shape_vec((1, seq_length), input_ids)?;
        let attention_mask_clone = attention_mask.clone();
        let attention_mask_array = Array::from_shape_vec((1, seq_length), attention_mask_clone)?;
        let token_type_ids_array = Array::from_shape_vec((1, seq_length), token_type_ids)?;

        // Create ort Values
        let input_ids_value = ort::value::Value::from_array(input_ids_array)?;
        let attention_mask_value = ort::value::Value::from_array(attention_mask_array)?;
        let token_type_ids_value = ort::value::Value::from_array(token_type_ids_array)?;

        // Run model and extract embeddings in one scope
        let (seq_len, hidden_dim, embeddings_vec) = {
            let mut session = self.session.borrow_mut();
            let outputs = session.run(ort::inputs!{
                "input_ids" => input_ids_value,
                "attention_mask" => attention_mask_value,
                "token_type_ids" => token_type_ids_value
            })?;

            // Extract embeddings (last hidden state)
            let (shape, embeddings_data) = outputs["last_hidden_state"]
                .try_extract_tensor::<f32>()?;
            
            let seq_len = shape[1] as usize;
            let hidden_dim = shape[2] as usize;
            
            // Copy the data to owned Vec
            let embeddings_vec = embeddings_data.to_vec();
            
            (seq_len, hidden_dim, embeddings_vec)
        };

        // Mean pooling
        let pooled = self.mean_pooling(&embeddings_vec, seq_len, hidden_dim, &attention_mask)?;

        Ok(pooled)
    }

    fn mean_pooling(&self, embeddings: &[f32], seq_length: usize, hidden_size: usize, attention_mask: &[i64]) -> Result<Vec<f32>> {
        // embeddings shape: [batch_size, seq_length, hidden_size]
        // Convert flat vector to 2D access (batch=0)

        // Apply attention mask and sum
        let mut pooled = vec![0.0f32; hidden_size];
        let mut mask_sum = 0.0f32;

        for (i, &mask_val) in attention_mask.iter().enumerate() {
            if i >= seq_length {
                break;
            }
            let mask = mask_val as f32;
            mask_sum += mask;

            for j in 0..hidden_size {
                let idx = i * hidden_size + j;
                pooled[j] += embeddings[idx] * mask;
            }
        }

        // Normalize
        if mask_sum > 0.0 {
            for val in &mut pooled {
                *val /= mask_sum;
            }
        }

        // L2 normalization
        let norm: f32 = pooled.iter().map(|x| x * x).sum::<f32>().sqrt();
        if norm > 0.0 {
            for val in &mut pooled {
                *val /= norm;
            }
        }

        Ok(pooled)
    }

    /// Perform semantic search
    pub fn semantic_search(
        &self,
        query: &str,
        snippets: &[Snippet],
        stored_embeddings: &[(i64, Vec<f32>)],
    ) -> Result<Vec<SearchResult>> {
        // Generate embedding for the query
        let query_embedding = self.generate_embedding(query)?;

        // Calculate cosine similarity with all snippets
        let mut results: Vec<SearchResult> = snippets
            .iter()
            .filter_map(|snippet| {
                let snippet_id = snippet.id?;

                // Find stored embedding
                let snippet_embedding = stored_embeddings
                    .iter()
                    .find(|(id, _)| *id == snippet_id)
                    .map(|(_, emb)| emb)?;

                // Calculate cosine similarity
                let score = cosine_similarity(&query_embedding, snippet_embedding);

                Some(SearchResult {
                    snippet: snippet.clone(),
                    score,
                    highlight: None,
                })
            })
            .filter(|r| r.score > 0.3) // Minimum similarity threshold
            .collect();

        // Sort by score (descending)
        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));

        Ok(results)
    }

    /// Generate snippet description for embedding (combines title, description, and code)
    pub fn generate_snippet_text(snippet: &Snippet) -> String {
        let mut text = snippet.title.clone();

        if let Some(desc) = &snippet.description {
            text.push_str(" ");
            text.push_str(desc);
        }

        text.push_str(" ");
        text.push_str(&snippet.content);

        // Truncate if too long (BERT models usually have 512 token limit)
        if text.len() > 2000 {
            text.truncate(2000);
        }

        text
    }
}

/// Calculate cosine similarity between two vectors
fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() {
        return 0.0;
    }

    let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    
    // Vectors are already normalized from mean_pooling, so dot product = cosine similarity
    dot_product.max(-1.0).min(1.0)
}

pub fn get_models_dir() -> Result<PathBuf> {
    let models_dir = dirs::data_local_dir()
        .context("Failed to get app data directory")?
        .join("snippet-vault")
        .join("models");

    std::fs::create_dir_all(&models_dir)?;
    Ok(models_dir)
}

/// Download model and tokenizer from Hugging Face
pub async fn download_model(
    model_url: &str,
    _model_name: &str,
    _progress_callback: Option<Box<dyn Fn(u64, u64) + Send>>,
) -> Result<(PathBuf, PathBuf)> {
    let models_dir = get_models_dir()?;
    let model_dir = models_dir.join(MODEL_NAME);
    std::fs::create_dir_all(&model_dir)?;

    let model_path = model_dir.join("model.onnx");
    let tokenizer_path = model_dir.join("tokenizer.json");

    // Check if files already exist
    if model_path.exists() && tokenizer_path.exists() {
        return Ok((model_path, tokenizer_path));
    }

    // Download from Hugging Face if files don't exist
    if !model_path.exists() || !tokenizer_path.exists() {
        let base_url = if model_url.is_empty() {
            format!("https://huggingface.co/sentence-transformers/{}/resolve/main", MODEL_NAME)
        } else {
            model_url.to_string()
        };

        // Download model.onnx
        if !model_path.exists() {
            let model_url = format!("{}/onnx/model.onnx", base_url);
            download_file(&model_url, &model_path).await?;
        }

        // Download tokenizer.json
        if !tokenizer_path.exists() {
            let tokenizer_url = format!("{}/tokenizer.json", base_url);
            download_file(&tokenizer_url, &tokenizer_path).await?;
        }
    }

    Ok((model_path, tokenizer_path))
}

async fn download_file(url: &str, dest: &PathBuf) -> Result<()> {
    use futures_util::StreamExt;

    println!("Downloading {} to {}...", url, dest.display());
    let response = reqwest::get(url).await?;
    let total_size = response.content_length().unwrap_or(0);

    let mut file = tokio::fs::File::create(dest).await?;
    let mut downloaded = 0u64;
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        use tokio::io::AsyncWriteExt;
        file.write_all(&chunk).await?;
        downloaded += chunk.len() as u64;

        // Print progress
        if total_size > 0 {
            let progress = (downloaded as f64 / total_size as f64) * 100.0;
            if downloaded % (total_size / 10).max(1) == 0 {
                println!("Download progress: {:.1}%", progress);
            }
        }
    }

    println!("Download complete: {}", dest.display());
    Ok(())
}
