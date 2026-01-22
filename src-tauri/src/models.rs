use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Snippet {
    pub id: Option<i64>,
    pub title: String,
    pub content: String,
    pub language: String,
    pub description: Option<String>,
    pub tags: Option<String>,
    pub folder_id: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Folder {
    pub id: Option<i64>,
    pub name: String,
    pub icon: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub snippet_count: Option<i64>,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardEntry {
    pub id: Option<i64>,
    pub content: String,
    pub source: String,
    pub category: String,
    pub created_at: String,
}

