use anyhow::{Context, Result};
use std::path::{Path, PathBuf};
use std::fs;
use std::io::Write;

const MAX_FILE_SIZE: i64 = 50 * 1024 * 1024; // 50MB

pub struct FileStorageManager {
    storage_dir: PathBuf,
}

impl FileStorageManager {
    pub fn new() -> Result<Self> {
        let app_data = dirs::data_local_dir()
            .context("Failed to get app data directory")?
            .join("nobraindev");

        // Ensure parent directory exists
        fs::create_dir_all(&app_data)?;

        let storage_dir = app_data.join("files");
        fs::create_dir_all(&storage_dir)?;

        Ok(FileStorageManager { storage_dir })
    }

    /// Save uploaded file to local storage
    /// Returns the storage path where the file was saved
    pub fn save_file(&self, filename: &str, file_data: &[u8]) -> Result<PathBuf> {
        // Sanitize filename
        let sanitized_filename = Self::sanitize_filename(filename);

        // Generate unique filename (timestamp + original name)
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)?
            .as_secs();
        let unique_filename = format!("{}_{}", timestamp, sanitized_filename);

        let file_path = self.storage_dir.join(&unique_filename);

        // Validate file size
        Self::validate_size(file_data.len() as i64)?;

        // Write file to disk
        let mut file = fs::File::create(&file_path)
            .context("Failed to create file")?;
        file.write_all(file_data)
            .context("Failed to write file data")?;

        Ok(file_path)
    }

    /// Read file data from local storage
    pub fn read_file(&self, storage_path: &str) -> Result<Vec<u8>> {
        let file_path = Path::new(storage_path);
        if !file_path.exists() {
            return Err(anyhow::anyhow!("File not found: {}", storage_path));
        }

        fs::read(file_path)
            .context("Failed to read file")
    }

    /// Delete file from local storage
    pub fn delete_file(&self, storage_path: &str) -> Result<()> {
        let file_path = Path::new(storage_path);
        if file_path.exists() {
            fs::remove_file(file_path)
                .context("Failed to delete file")?;
        }
        Ok(())
    }

    /// Validate file size (max 50MB)
    pub fn validate_size(file_size: i64) -> Result<()> {
        if file_size > MAX_FILE_SIZE {
            return Err(anyhow::anyhow!(
                "File size exceeds maximum limit of 50MB"
            ));
        }
        Ok(())
    }

    /// Detect file type category from extension
    pub fn detect_file_type(filename: &str) -> String {
        let extension = Path::new(filename)
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase())
            .unwrap_or_default();

        match extension.as_str() {
            // Images
            "jpg" | "jpeg" | "png" | "gif" | "bmp" | "svg" | "webp" | "ico" => "image".to_string(),

            // Videos
            "mp4" | "avi" | "mkv" | "mov" | "wmv" | "flv" | "webm" => "video".to_string(),

            // Audio
            "mp3" | "wav" | "ogg" | "flac" | "aac" | "m4a" => "audio".to_string(),

            // Documents
            "pdf" | "doc" | "docx" | "xls" | "xlsx" | "ppt" | "pptx" | "odt" | "ods" | "odp" => "document".to_string(),

            // Text/Code
            "txt" | "md" | "csv" | "json" | "xml" | "yaml" | "yml" | "toml" | "ini" | "conf" | "log" => "text".to_string(),
            "js" | "ts" | "jsx" | "tsx" | "py" | "rs" | "go" | "java" | "c" | "cpp" | "h" | "hpp" | "cs" | "php" | "rb" | "swift" | "kt" => "code".to_string(),
            "html" | "css" | "scss" | "sass" | "less" => "code".to_string(),
            "sh" | "bash" | "zsh" | "fish" | "ps1" => "code".to_string(),

            // Archives
            "zip" | "rar" | "7z" | "tar" | "gz" | "bz2" => "archive".to_string(),

            // Executables (block these)
            "exe" | "msi" | "app" | "dmg" | "deb" | "rpm" => "executable".to_string(),
            "bat" | "cmd" | "sh" => "script".to_string(),

            // Default
            _ => "other".to_string(),
        }
    }

    /// Get MIME type from file extension
    pub fn get_mime_type(filename: &str) -> Option<String> {
        let extension = Path::new(filename)
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase())
            .unwrap_or_default();

        match extension.as_str() {
            // Images
            "jpg" | "jpeg" => Some("image/jpeg".to_string()),
            "png" => Some("image/png".to_string()),
            "gif" => Some("image/gif".to_string()),
            "svg" => Some("image/svg+xml".to_string()),
            "webp" => Some("image/webp".to_string()),
            "bmp" => Some("image/bmp".to_string()),
            "ico" => Some("image/x-icon".to_string()),

            // Videos
            "mp4" => Some("video/mp4".to_string()),
            "webm" => Some("video/webm".to_string()),
            "mov" => Some("video/quicktime".to_string()),
            "avi" => Some("video/x-msvideo".to_string()),
            "mkv" => Some("video/x-matroska".to_string()),

            // Audio
            "mp3" => Some("audio/mpeg".to_string()),
            "wav" => Some("audio/wav".to_string()),
            "ogg" => Some("audio/ogg".to_string()),
            "flac" => Some("audio/flac".to_string()),
            "aac" => Some("audio/aac".to_string()),
            "m4a" => Some("audio/mp4".to_string()),
            "weba" => Some("audio/webm".to_string()),

            // Documents
            "pdf" => Some("application/pdf".to_string()),
            "doc" => Some("application/msword".to_string()),
            "docx" => Some("application/vnd.openxmlformats-officedocument.wordprocessingml.document".to_string()),
            "xls" => Some("application/vnd.ms-excel".to_string()),
            "xlsx" => Some("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".to_string()),
            "ppt" => Some("application/vnd.ms-powerpoint".to_string()),
            "pptx" => Some("application/vnd.openxmlformats-officedocument.presentationml.presentation".to_string()),

            // Text/Code
            "txt" => Some("text/plain".to_string()),
            "html" => Some("text/html".to_string()),
            "css" => Some("text/css".to_string()),
            "js" => Some("application/javascript".to_string()),
            "json" => Some("application/json".to_string()),
            "xml" => Some("application/xml".to_string()),
            "md" => Some("text/markdown".to_string()),
            "csv" => Some("text/csv".to_string()),

            // Archives
            "zip" => Some("application/zip".to_string()),
            "rar" => Some("application/vnd.rar".to_string()),
            "7z" => Some("application/x-7z-compressed".to_string()),
            "tar" => Some("application/x-tar".to_string()),
            "gz" => Some("application/gzip".to_string()),

            _ => None,
        }
    }

    /// Sanitize filename to prevent path traversal and other attacks
    pub fn sanitize_filename(filename: &str) -> String {
        // Remove null bytes and path separators
        let sanitized = filename
            .replace('\0', "")
            .replace('\\', "")
            .replace('/', "")
            .replace("..", "");

        // Keep only safe characters (alphanumeric, spaces, dots, hyphens, underscores, parentheses)
        sanitized
            .chars()
            .map(|c| if c.is_alphanumeric() || " .-_()".contains(c) { c } else { '_' })
            .collect()
    }

    /// Get the storage directory path
    pub fn get_storage_dir(&self) -> &Path {
        &self.storage_dir
    }
}

impl Default for FileStorageManager {
    fn default() -> Self {
        Self::new().expect("Failed to initialize FileStorageManager")
    }
}
