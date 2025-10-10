use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Snippet {
    pub id: Option<i64>,
    pub title: String,
    pub content: String,
    pub language: String,
    pub description: Option<String>,
    pub tags: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub snippet: Snippet,
    pub score: f32,
    pub highlight: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModelInfo {
    pub name: String,
    pub path: Option<String>,
    pub size: Option<u64>,
    pub downloaded: bool,
    pub loaded: bool,
}

