use anyhow::{Context, Result};
use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use std::path::PathBuf;

use crate::models::Snippet;

const MODEL_VERSION: &str = "all-MiniLM-L6-v2";

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new() -> Result<Self> {
        let db_path = Self::get_db_path()?;
        
        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let conn = Connection::open(&db_path)
            .context("Failed to open database connection")?;

        let db = Database { conn };
        db.initialize()?;
        Ok(db)
    }

    fn get_db_path() -> Result<PathBuf> {
        let app_data = dirs::data_local_dir()
            .context("Failed to get app data directory")?
            .join("nobraindev");
        
        std::fs::create_dir_all(&app_data)?;
        Ok(app_data.join("nobraindev.db"))
    }

    fn initialize(&self) -> Result<()> {
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS snippets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                language TEXT NOT NULL,
                description TEXT,
                tags TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        // Create indexes for better search performance
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_title ON snippets(title)",
            [],
        )?;
        
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_language ON snippets(language)",
            [],
        )?;

        // Create embeddings table for semantic search
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS embeddings (
                snippet_id INTEGER PRIMARY KEY,
                embedding BLOB NOT NULL,
                model_version TEXT NOT NULL,
                FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE
            )",
            [],
        )?;

        Ok(())
    }

    pub fn create_snippet(&self, snippet: &Snippet) -> Result<i64> {
        let now = Utc::now().to_rfc3339();
        
        self.conn.execute(
            "INSERT INTO snippets (title, content, language, description, tags, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                snippet.title,
                snippet.content,
                snippet.language,
                snippet.description,
                snippet.tags,
                now,
                now
            ],
        )?;

        Ok(self.conn.last_insert_rowid())
    }

    pub fn get_snippet(&self, id: i64) -> Result<Option<Snippet>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, title, content, language, description, tags, created_at, updated_at
             FROM snippets WHERE id = ?1"
        )?;

        let snippet = stmt.query_row(params![id], |row| {
            Ok(Snippet {
                id: Some(row.get(0)?),
                title: row.get(1)?,
                content: row.get(2)?,
                language: row.get(3)?,
                description: row.get(4)?,
                tags: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        }).optional()?;

        Ok(snippet)
    }

    pub fn get_all_snippets(&self) -> Result<Vec<Snippet>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, title, content, language, description, tags, created_at, updated_at
             FROM snippets ORDER BY updated_at DESC"
        )?;

        let snippets = stmt.query_map([], |row| {
            Ok(Snippet {
                id: Some(row.get(0)?),
                title: row.get(1)?,
                content: row.get(2)?,
                language: row.get(3)?,
                description: row.get(4)?,
                tags: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(snippets)
    }

    pub fn update_snippet(&self, id: i64, snippet: &Snippet) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        
        self.conn.execute(
            "UPDATE snippets 
             SET title = ?1, content = ?2, language = ?3, description = ?4, tags = ?5, updated_at = ?6
             WHERE id = ?7",
            params![
                snippet.title,
                snippet.content,
                snippet.language,
                snippet.description,
                snippet.tags,
                now,
                id
            ],
        )?;

        Ok(())
    }

    pub fn delete_snippet(&self, id: i64) -> Result<()> {
        self.conn.execute("DELETE FROM snippets WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn search_snippets(&self, query: &str) -> Result<Vec<Snippet>> {
        let search_pattern = format!("%{}%", query);
        
        let mut stmt = self.conn.prepare(
            "SELECT id, title, content, language, description, tags, created_at, updated_at
             FROM snippets 
             WHERE title LIKE ?1 
                OR content LIKE ?1 
                OR description LIKE ?1 
                OR tags LIKE ?1
             ORDER BY updated_at DESC"
        )?;

        let snippets = stmt.query_map(params![search_pattern], |row| {
            Ok(Snippet {
                id: Some(row.get(0)?),
                title: row.get(1)?,
                content: row.get(2)?,
                language: row.get(3)?,
                description: row.get(4)?,
                tags: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(snippets)
    }

    pub fn store_embedding(&self, snippet_id: i64, embedding: &[f32]) -> Result<()> {
        // Convert f32 slice to bytes
        let embedding_bytes: Vec<u8> = embedding
            .iter()
            .flat_map(|f| f.to_le_bytes())
            .collect();

        self.conn.execute(
            "INSERT OR REPLACE INTO embeddings (snippet_id, embedding, model_version)
             VALUES (?1, ?2, ?3)",
            params![snippet_id, embedding_bytes, MODEL_VERSION],
        )?;

        Ok(())
    }

    pub fn get_embedding(&self, snippet_id: i64) -> Result<Option<Vec<f32>>> {
        let result: Option<Vec<u8>> = self
            .conn
            .query_row(
                "SELECT embedding FROM embeddings WHERE snippet_id = ?1",
                params![snippet_id],
                |row| row.get(0),
            )
            .optional()?;

        Ok(result.map(|bytes| {
            bytes
                .chunks_exact(4)
                .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
                .collect()
        }))
    }

    pub fn get_all_embeddings(&self) -> Result<Vec<(i64, Vec<f32>)>> {
        let mut stmt = self.conn.prepare(
            "SELECT snippet_id, embedding FROM embeddings"
        )?;

        let embeddings = stmt
            .query_map([], |row| {
                let snippet_id: i64 = row.get(0)?;
                let bytes: Vec<u8> = row.get(1)?;
                let embedding: Vec<f32> = bytes
                    .chunks_exact(4)
                    .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
                    .collect();
                Ok((snippet_id, embedding))
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(embeddings)
    }

    pub fn delete_embedding(&self, snippet_id: i64) -> Result<()> {
        self.conn.execute(
            "DELETE FROM embeddings WHERE snippet_id = ?1",
            params![snippet_id],
        )?;
        Ok(())
    }
}

