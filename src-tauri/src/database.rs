use anyhow::{Context, Result};
use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use std::path::PathBuf;

use crate::models::{Snippet, Folder, File};

const MODEL_VERSION: &str = "all-MiniLM-L6-v2";

// List of random folder emojis
const FOLDER_EMOJIS: &[&str] = &[
    "📁", "📂", "🗂️", "📚", "📖", "📝", "✏️", "🎨", "🎯", "💡",
    "🔥", "⚡", "🚀", "💻", "🖥️", "📱", "🌐", "🔧", "⚙️", "🔩",
    "🎵", "🎬", "📷", "🎥", "🎮", "🕹️", "🗺️", "🧭", "📊", "📈",
    "💼", "📋", "📌", "📍", "✂️", "📏", "🖊️", "🖋️", "💎", "🔑",
    "🏠", "🏢", "🏗️", "🏭", "🌟", "⭐", "🌙", "☀️", "🌈", "🍀",
];

pub struct Database {
    conn: Connection,
}

impl Database {
    fn get_random_emoji() -> &'static str {
        use std::time::{SystemTime, UNIX_EPOCH};
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos() as usize;
        FOLDER_EMOJIS[timestamp % FOLDER_EMOJIS.len()]
    }
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
        // Create folders table first (before snippets, since snippets references it)
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS folders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                icon TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        // Migrate: Add icon to existing folders table if it doesn't exist
        let has_icon: std::result::Result<bool, rusqlite::Error> = self.conn.query_row(
            "SELECT COUNT(*) > 0 FROM pragma_table_info('folders') WHERE name = 'icon'",
            [],
            |row| row.get(0)
        );

        if has_icon.is_err() || !has_icon.unwrap_or(false) {
            let _ = self.conn.execute(
                "ALTER TABLE folders ADD COLUMN icon TEXT",
                [],
            );
        }

        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_folders_name ON folders(name)",
            [],
        )?;

        // Migrate: Add folder_id to existing snippets table BEFORE creating the table
        // SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we check the schema first
        let has_folder_id: std::result::Result<bool, rusqlite::Error> = self.conn.query_row(
            "SELECT COUNT(*) > 0 FROM pragma_table_info('snippets') WHERE name = 'folder_id'",
            [],
            |row| row.get(0)
        );

        // If the query fails or returns false, add the column
        if has_folder_id.is_err() || !has_folder_id.unwrap_or(false) {
            let _ = self.conn.execute(
                "ALTER TABLE snippets ADD COLUMN folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL",
                [],
            );
        }

        // Now create snippets table (with folder_id) - this only affects new installs
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS snippets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                language TEXT NOT NULL,
                description TEXT,
                tags TEXT,
                folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
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

        // Only create folder index if folder_id exists
        let folder_id_exists: std::result::Result<bool, _> = self.conn.query_row(
            "SELECT COUNT(*) > 0 FROM pragma_table_info('snippets') WHERE name = 'folder_id'",
            [],
            |row| row.get(0)
        );

        if folder_id_exists.unwrap_or(false) {
            let _ = self.conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_snippets_folder ON snippets(folder_id)",
                [],
            );
        }

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

        // Create clipboard history table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS clipboard_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                source TEXT NOT NULL,
                category TEXT NOT NULL,
                created_at TEXT NOT NULL
            )",
            [],
        )?;

        // Create index for clipboard history
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_clipboard_created ON clipboard_history(created_at DESC)",
            [],
        )?;

        // Create files table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                file_type TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
                storage_path TEXT NOT NULL,
                cloud_storage_path TEXT,
                mime_type TEXT,
                description TEXT,
                tags TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id)",
            [],
        )?;

        Ok(())
    }

    pub fn create_snippet(&self, snippet: &Snippet) -> Result<i64> {
        let now = Utc::now().to_rfc3339();

        self.conn.execute(
            "INSERT INTO snippets (title, content, language, description, tags, folder_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                snippet.title,
                snippet.content,
                snippet.language,
                snippet.description,
                snippet.tags,
                snippet.folder_id,
                now,
                now
            ],
        )?;

        Ok(self.conn.last_insert_rowid())
    }

    pub fn get_snippet(&self, id: i64) -> Result<Option<Snippet>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, title, content, language, description, tags, folder_id, created_at, updated_at
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
                folder_id: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        }).optional()?;

        Ok(snippet)
    }

    pub fn get_all_snippets(&self) -> Result<Vec<Snippet>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, title, content, language, description, tags, folder_id, created_at, updated_at
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
                folder_id: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(snippets)
    }

    pub fn update_snippet(&self, id: i64, snippet: &Snippet) -> Result<()> {
        let now = Utc::now().to_rfc3339();

        self.conn.execute(
            "UPDATE snippets
             SET title = ?1, content = ?2, language = ?3, description = ?4, tags = ?5, folder_id = ?6, updated_at = ?7
             WHERE id = ?8",
            params![
                snippet.title,
                snippet.content,
                snippet.language,
                snippet.description,
                snippet.tags,
                snippet.folder_id,
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
            "SELECT id, title, content, language, description, tags, folder_id, created_at, updated_at
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
                folder_id: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(snippets)
    }

    // Folder CRUD methods
    pub fn create_folder(&self, name: &str, icon: Option<&str>) -> Result<i64> {
        let now = Utc::now().to_rfc3339();
        let folder_icon = icon.unwrap_or_else(|| Self::get_random_emoji());

        self.conn.execute(
            "INSERT INTO folders (name, icon, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![name, folder_icon, now, now],
        )?;

        Ok(self.conn.last_insert_rowid())
    }

    pub fn get_all_folders(&self) -> Result<Vec<Folder>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, icon, created_at, updated_at
             FROM folders ORDER BY name"
        )?;

        let folders = stmt.query_map([], |row| {
            Ok(Folder {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                icon: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                snippet_count: None,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(folders)
    }

    pub fn get_folder(&self, id: i64) -> Result<Option<Folder>> {
        let mut stmt = self.conn.prepare(
            "SELECT f.id, f.name, f.icon, f.created_at, f.updated_at, COUNT(s.id) as snippet_count
             FROM folders f
             LEFT JOIN snippets s ON s.folder_id = f.id
             WHERE f.id = ?1
             GROUP BY f.id"
        )?;

        let folder = stmt.query_row(params![id], |row| {
            Ok(Folder {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                icon: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                snippet_count: Some(row.get(5)?),
            })
        }).optional()?;

        Ok(folder)
    }

    pub fn update_folder(&self, id: i64, name: &str, icon: Option<&str>) -> Result<()> {
        let now = Utc::now().to_rfc3339();

        if let Some(icon_str) = icon {
            self.conn.execute(
                "UPDATE folders SET name = ?1, icon = ?2, updated_at = ?3 WHERE id = ?4",
                params![name, icon_str, now, id],
            )?;
        } else {
            self.conn.execute(
                "UPDATE folders SET name = ?1, updated_at = ?2 WHERE id = ?3",
                params![name, now, id],
            )?;
        }

        Ok(())
    }

    pub fn delete_folder(&self, id: i64) -> Result<()> {
        // Set all snippets in this folder to uncategorized (folder_id = NULL)
        self.conn.execute(
            "UPDATE snippets SET folder_id = NULL WHERE folder_id = ?1",
            params![id],
        )?;

        // Then delete the folder
        self.conn.execute("DELETE FROM folders WHERE id = ?1", params![id])?;

        Ok(())
    }

    // Snippet-folder relationship methods
    pub fn get_snippets_by_folder(&self, folder_id: Option<i64>) -> Result<Vec<Snippet>> {
        let sql = if folder_id.is_some() {
            "SELECT id, title, content, language, description, tags, folder_id, created_at, updated_at
             FROM snippets WHERE folder_id = ?1 ORDER BY updated_at DESC"
        } else {
            "SELECT id, title, content, language, description, tags, folder_id, created_at, updated_at
             FROM snippets WHERE folder_id IS NULL ORDER BY updated_at DESC"
        };

        let mut stmt = self.conn.prepare(sql)?;

        let snippet_mapper = |row: &rusqlite::Row| -> std::result::Result<Snippet, rusqlite::Error> {
            Ok(Snippet {
                id: Some(row.get(0)?),
                title: row.get(1)?,
                content: row.get(2)?,
                language: row.get(3)?,
                description: row.get(4)?,
                tags: row.get(5)?,
                folder_id: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        };

        let snippets = if let Some(fid) = folder_id {
            stmt.query_map(params![fid], snippet_mapper)?
        } else {
            stmt.query_map(params![], snippet_mapper)?
        }
        .collect::<Result<Vec<_>, _>>()?;

        Ok(snippets)
    }

    pub fn update_snippet_folder(&self, snippet_id: i64, folder_id: Option<i64>) -> Result<()> {
        self.conn.execute(
            "UPDATE snippets SET folder_id = ?1 WHERE id = ?2",
            params![folder_id, snippet_id],
        )?;
        Ok(())
    }

    pub fn organize_snippets(&self, mappings: &[(i64, Option<i64>)]) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;

        for (snippet_id, folder_id) in mappings {
            tx.execute(
                "UPDATE snippets SET folder_id = ?1 WHERE id = ?2",
                params![folder_id, snippet_id],
            )?;
        }

        tx.commit()?;
        Ok(())
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

    // Clipboard history methods
    pub fn save_clipboard_entry(&self, content: &str, source: &str, category: &str, created_at: &str) -> Result<i64> {
        self.conn.execute(
            "INSERT INTO clipboard_history (content, source, category, created_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![content, source, category, created_at],
        )?;

        Ok(self.conn.last_insert_rowid())
    }

    pub fn get_clipboard_history(&self, limit: i64) -> Result<Vec<crate::models::ClipboardEntry>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, content, source, category, created_at
             FROM clipboard_history
             ORDER BY created_at DESC
             LIMIT ?1"
        )?;

        let entries = stmt.query_map(params![limit], |row| {
            Ok(crate::models::ClipboardEntry {
                id: Some(row.get(0)?),
                content: row.get(1)?,
                source: row.get(2)?,
                category: row.get(3)?,
                created_at: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(entries)
    }

    pub fn get_clipboard_entry(&self, id: i64) -> Result<Option<crate::models::ClipboardEntry>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, content, source, category, created_at
             FROM clipboard_history WHERE id = ?1"
        )?;

        let entry = stmt.query_row(params![id], |row| {
            Ok(crate::models::ClipboardEntry {
                id: Some(row.get(0)?),
                content: row.get(1)?,
                source: row.get(2)?,
                category: row.get(3)?,
                created_at: row.get(4)?,
            })
        }).optional()?;

        Ok(entry)
    }

    pub fn delete_clipboard_entry(&self, id: i64) -> Result<()> {
        self.conn.execute(
            "DELETE FROM clipboard_history WHERE id = ?1",
            params![id],
        )?;

        Ok(())
    }

    pub fn clear_clipboard_history(&self) -> Result<()> {
        self.conn.execute(
            "DELETE FROM clipboard_history",
            [],
        )?;

        Ok(())
    }

    pub fn update_clipboard_entry(&self, id: i64, content: &str, source: &str, category: &str, updated_at: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE clipboard_history
             SET content = ?1, source = ?2, category = ?3, created_at = ?4
             WHERE id = ?5",
            params![content, source, category, updated_at, id],
        )?;

        Ok(())
    }

    // File CRUD methods

    pub fn create_file(&self, file: &File) -> Result<i64> {
        self.conn.execute(
            "INSERT INTO files (filename, file_type, file_size, folder_id, storage_path, cloud_storage_path, mime_type, description, tags, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                file.filename,
                file.file_type,
                file.file_size,
                file.folder_id,
                file.storage_path,
                file.cloud_storage_path,
                file.mime_type,
                file.description,
                file.tags,
                file.created_at,
                file.updated_at,
            ],
        )?;

        Ok(self.conn.last_insert_rowid())
    }

    pub fn get_file(&self, id: i64) -> Result<Option<File>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, filename, file_type, file_size, folder_id, storage_path, cloud_storage_path, mime_type, description, tags, created_at, updated_at
             FROM files WHERE id = ?1"
        )?;

        let file = stmt.query_row(params![id], |row| {
            Ok(File {
                id: Some(row.get(0)?),
                filename: row.get(1)?,
                file_type: row.get(2)?,
                file_size: row.get(3)?,
                folder_id: row.get(4)?,
                storage_path: row.get(5)?,
                cloud_storage_path: row.get(6)?,
                mime_type: row.get(7)?,
                description: row.get(8)?,
                tags: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        }).optional()?;

        Ok(file)
    }

    pub fn get_all_files(&self) -> Result<Vec<File>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, filename, file_type, file_size, folder_id, storage_path, cloud_storage_path, mime_type, description, tags, created_at, updated_at
             FROM files ORDER BY updated_at DESC"
        )?;

        let files = stmt.query_map([], |row| {
            Ok(File {
                id: Some(row.get(0)?),
                filename: row.get(1)?,
                file_type: row.get(2)?,
                file_size: row.get(3)?,
                folder_id: row.get(4)?,
                storage_path: row.get(5)?,
                cloud_storage_path: row.get(6)?,
                mime_type: row.get(7)?,
                description: row.get(8)?,
                tags: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(files)
    }

    pub fn get_files_by_folder(&self, folder_id: Option<i64>) -> Result<Vec<File>> {
        let sql = if folder_id.is_some() {
            "SELECT id, filename, file_type, file_size, folder_id, storage_path, cloud_storage_path, mime_type, description, tags, created_at, updated_at
             FROM files WHERE folder_id = ?1 ORDER BY updated_at DESC"
        } else {
            "SELECT id, filename, file_type, file_size, folder_id, storage_path, cloud_storage_path, mime_type, description, tags, created_at, updated_at
             FROM files WHERE folder_id IS NULL ORDER BY updated_at DESC"
        };

        let mut stmt = self.conn.prepare(sql)?;

        let file_mapper = |row: &rusqlite::Row| -> std::result::Result<File, rusqlite::Error> {
            Ok(File {
                id: Some(row.get(0)?),
                filename: row.get(1)?,
                file_type: row.get(2)?,
                file_size: row.get(3)?,
                folder_id: row.get(4)?,
                storage_path: row.get(5)?,
                cloud_storage_path: row.get(6)?,
                mime_type: row.get(7)?,
                description: row.get(8)?,
                tags: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        };

        let files = if let Some(fid) = folder_id {
            stmt.query_map(params![fid], file_mapper)?
        } else {
            stmt.query_map(params![], file_mapper)?
        }
        .collect::<Result<Vec<_>, _>>()?;

        Ok(files)
    }

    pub fn update_file(&self, id: i64, file: &File) -> Result<()> {
        let now = Utc::now().to_rfc3339();

        self.conn.execute(
            "UPDATE files
             SET filename = ?1, file_type = ?2, file_size = ?3, folder_id = ?4, storage_path = ?5, cloud_storage_path = ?6, mime_type = ?7, description = ?8, tags = ?9, updated_at = ?10
             WHERE id = ?11",
            params![
                file.filename,
                file.file_type,
                file.file_size,
                file.folder_id,
                file.storage_path,
                file.cloud_storage_path,
                file.mime_type,
                file.description,
                file.tags,
                now,
                id
            ],
        )?;

        Ok(())
    }

    pub fn delete_file(&self, id: i64) -> Result<()> {
        self.conn.execute("DELETE FROM files WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn search_files(&self, query: &str) -> Result<Vec<File>> {
        let search_pattern = format!("%{}%", query);

        let mut stmt = self.conn.prepare(
            "SELECT id, filename, file_type, file_size, folder_id, storage_path, cloud_storage_path, mime_type, description, tags, created_at, updated_at
             FROM files
             WHERE filename LIKE ?1
                OR description LIKE ?1
                OR tags LIKE ?1
                OR file_type LIKE ?1
             ORDER BY updated_at DESC"
        )?;

        let files = stmt.query_map(params![search_pattern], |row| {
            Ok(File {
                id: Some(row.get(0)?),
                filename: row.get(1)?,
                file_type: row.get(2)?,
                file_size: row.get(3)?,
                folder_id: row.get(4)?,
                storage_path: row.get(5)?,
                cloud_storage_path: row.get(6)?,
                mime_type: row.get(7)?,
                description: row.get(8)?,
                tags: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(files)
    }

    pub fn update_file_cloud_path(&self, id: i64, cloud_path: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE files SET cloud_storage_path = ?1 WHERE id = ?2",
            params![cloud_path, id],
        )?;
        Ok(())
    }
}

