use tauri::State;

use crate::models::{ModelInfo, SearchResult, Snippet};
use crate::search::{get_models_dir, SearchEngine};
use crate::search::download_model as download_model_internal;
use crate::AppState;

#[tauri::command]
pub fn create_snippet(state: State<AppState>, snippet: Snippet) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let snippet_id = db.create_snippet(&snippet).map_err(|e| e.to_string())?;

    // Generate and store embedding if model is loaded
    let search_engine = state.search_engine.lock().map_err(|e| e.to_string())?;
    if let Some(engine) = search_engine.as_ref() {
        let mut snippet_with_id = snippet.clone();
        snippet_with_id.id = Some(snippet_id);
        
        let text = SearchEngine::generate_snippet_text(&snippet_with_id);
        match engine.generate_embedding(&text) {
            Ok(embedding) => {
                let _ = db.store_embedding(snippet_id, &embedding);
            }
            Err(e) => {
                eprintln!("Failed to generate embedding: {}", e);
            }
        }
    }

    Ok(snippet_id)
}

#[tauri::command]
pub fn get_all_snippets(state: State<AppState>) -> Result<Vec<Snippet>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_all_snippets().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_snippet(state: State<AppState>, id: i64) -> Result<Option<Snippet>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_snippet(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_snippet(state: State<AppState>, id: i64, snippet: Snippet) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_snippet(id, &snippet).map_err(|e| e.to_string())?;

    // Regenerate embedding if model is loaded
    let search_engine = state.search_engine.lock().map_err(|e| e.to_string())?;
    if let Some(engine) = search_engine.as_ref() {
        let mut snippet_with_id = snippet.clone();
        snippet_with_id.id = Some(id);
        
        let text = SearchEngine::generate_snippet_text(&snippet_with_id);
        match engine.generate_embedding(&text) {
            Ok(embedding) => {
                let _ = db.store_embedding(id, &embedding);
            }
            Err(e) => {
                eprintln!("Failed to generate embedding: {}", e);
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn delete_snippet(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_snippet(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_snippets(state: State<AppState>, query: String) -> Result<Vec<Snippet>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.search_snippets(&query).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn semantic_search(
    state: State<AppState>,
    query: String,
) -> Result<Vec<SearchResult>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let search_engine = state.search_engine.lock().map_err(|e| e.to_string())?;

    let snippets = db.get_all_snippets().map_err(|e| e.to_string())?;

    if let Some(engine) = search_engine.as_ref() {
        // Get all stored embeddings
        let embeddings = db.get_all_embeddings().map_err(|e| e.to_string())?;
        
        engine
            .semantic_search(&query, &snippets, &embeddings)
            .map_err(|e| e.to_string())
    } else {
        // Fallback to regular search if no model is loaded
        let results = db
            .search_snippets(&query)
            .map_err(|e| e.to_string())?
            .into_iter()
            .map(|snippet| SearchResult {
                snippet,
                score: 1.0,
                highlight: None,
            })
            .collect();
        Ok(results)
    }
}

#[tauri::command]
pub async fn download_model(_model_url: String, _model_name: String) -> Result<String, String> {
    // Download the model (without progress callback for now)
    let (model_path, _tokenizer_path) = download_model_internal("", "", None)
        .await
        .map_err(|e| e.to_string())?;

    Ok(format!(
        "Model downloaded successfully to: {}",
        model_path.display()
    ))
}

#[tauri::command]
pub fn get_model_status(state: State<AppState>) -> Result<ModelInfo, String> {
    let search_engine = state.search_engine.lock().map_err(|e| e.to_string())?;

    let models_dir = get_models_dir().map_err(|e| e.to_string())?;
    let model_dir = models_dir.join("all-MiniLM-L6-v2");
    let model_path = model_dir.join("model.onnx");
    let tokenizer_path = model_dir.join("tokenizer.json");

    let downloaded = model_path.exists() && tokenizer_path.exists();
    let size = if downloaded {
        std::fs::metadata(&model_path)
            .ok()
            .map(|m| m.len())
    } else {
        None
    };

    Ok(ModelInfo {
        name: "all-MiniLM-L6-v2".to_string(),
        path: if downloaded {
            Some(model_path.to_string_lossy().to_string())
        } else {
            None
        },
        size,
        downloaded,
        loaded: search_engine.as_ref().map(|e| e.is_loaded()).unwrap_or(false),
    })
}

#[tauri::command]
pub async fn load_model(state: State<'_, AppState>) -> Result<(), String> {
    let models_dir = get_models_dir().map_err(|e| e.to_string())?;
    let model_dir = models_dir.join("all-MiniLM-L6-v2");
    let model_path = model_dir.join("model.onnx");
    let tokenizer_path = model_dir.join("tokenizer.json");

    // Check if model exists, download if not
    if !model_path.exists() || !tokenizer_path.exists() {
        download_model_internal("", "", None)
            .await
            .map_err(|e| e.to_string())?;
    }

    // Load the model
    let engine = SearchEngine::new(model_path, tokenizer_path).map_err(|e| e.to_string())?;

    // Generate embeddings for all existing snippets
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let snippets = db.get_all_snippets().map_err(|e| e.to_string())?;

    for snippet in snippets {
        if let Some(id) = snippet.id {
            // Check if embedding already exists
            if db.get_embedding(id).map_err(|e| e.to_string())?.is_none() {
                let text = SearchEngine::generate_snippet_text(&snippet);
                if let Ok(embedding) = engine.generate_embedding(&text) {
                    let _ = db.store_embedding(id, &embedding);
                }
            }
        }
    }

    // Store the engine
    let mut search_engine = state.search_engine.lock().map_err(|e| e.to_string())?;
    *search_engine = Some(engine);

    Ok(())
}

#[tauri::command]
pub async fn regenerate_embeddings(state: State<'_, AppState>) -> Result<String, String> {
    let search_engine = state.search_engine.lock().map_err(|e| e.to_string())?;
    
    if search_engine.is_none() {
        return Err("Model not loaded. Please load the model first.".to_string());
    }

    let engine = search_engine.as_ref().unwrap();
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let snippets = db.get_all_snippets().map_err(|e| e.to_string())?;

    let mut count = 0;
    for snippet in snippets {
        if let Some(id) = snippet.id {
            let text = SearchEngine::generate_snippet_text(&snippet);
            if let Ok(embedding) = engine.generate_embedding(&text) {
                db.store_embedding(id, &embedding).map_err(|e| e.to_string())?;
                count += 1;
            }
        }
    }

    Ok(format!("Regenerated {} embeddings", count))
}
