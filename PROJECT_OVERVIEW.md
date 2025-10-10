# SnippetVault - Project Overview

## 🎯 Project Summary

**SnippetVault** is a local-first, desktop application for managing code snippets with AI-powered semantic search capabilities. Built with Tauri (Rust backend) and vanilla JavaScript frontend.

**Key Features:**
- 📝 Store and manage code snippets locally
- 🔍 Fast keyword and AI-powered semantic search
- 🎨 Beautiful, modern dark-themed UI
- 🚀 Lightweight and fast (Rust + Tauri)
- 🔒 100% local - your data never leaves your machine
- 🤖 Optional SLM (Small Language Model) integration
- 🌈 Syntax highlighting for 20+ languages

## 📁 Project Structure

```
snippet-vault/
├── README.md              # Main documentation
├── INSTALL.md            # Detailed installation guide
├── QUICKSTART.md         # Quick start guide
├── PROJECT_OVERVIEW.md   # This file
├── .gitignore           # Git ignore rules
│
├── setup.sh             # Automated setup script
├── dev.sh               # Development mode launcher
├── build.sh             # Production build script
├── run.sh               # Quick run script
├── verify.sh            # Project verification script
│
├── src-tauri/           # Rust backend
│   ├── Cargo.toml       # Rust dependencies
│   ├── tauri.conf.json  # Tauri configuration
│   ├── build.rs         # Build script
│   ├── .cargo/
│   │   └── config.toml  # Cargo configuration
│   ├── icons/           # Application icons
│   └── src/
│       ├── main.rs      # Application entry point
│       ├── database.rs  # SQLite database layer
│       ├── models.rs    # Data models (Snippet, SearchResult, etc.)
│       ├── commands.rs  # Tauri command handlers (API)
│       └── search.rs    # Search engine & SLM integration
│
└── ui/                  # Frontend
    ├── index.html       # Main UI structure
    ├── styles.css       # Styling (dark theme)
    └── app.js           # JavaScript application logic
```

## 🏗️ Architecture

### Backend (Rust + Tauri)

**Technology Stack:**
- **Tauri 1.5**: Cross-platform desktop framework
- **rusqlite**: SQLite database for local storage
- **llm crate**: For loading and running SLMs
- **chrono**: Date/time handling
- **anyhow**: Error handling

**Components:**

1. **Database Layer (`database.rs`)**
   - SQLite connection management
   - CRUD operations for snippets
   - Full-text search
   - Indexed queries

2. **Models (`models.rs`)**
   - `Snippet`: Core data structure
   - `SearchResult`: Search results with scores
   - `ModelInfo`: SLM model metadata

3. **Commands (`commands.rs`)**
   - Tauri command handlers (exposed to frontend)
   - `create_snippet`, `update_snippet`, `delete_snippet`
   - `search_snippets`, `semantic_search`
   - `load_model`, `get_model_status`

4. **Search Engine (`search.rs`)**
   - Keyword search (SQLite LIKE queries)
   - Semantic search (SLM-powered)
   - Model management (download, load)
   - Embeddings generation (future)

### Frontend (Vanilla JS)

**Technology Stack:**
- Pure JavaScript (no framework)
- HTML5 + CSS3
- Highlight.js for syntax highlighting
- Tauri API for backend communication

**Features:**
- Reactive UI updates
- Real-time search
- Code editor with syntax highlighting
- Toast notifications
- Modal dialogs
- Keyboard shortcuts (future)

### Data Flow

```
User Input (UI)
    ↓
JavaScript (app.js)
    ↓
Tauri API (invoke)
    ↓
Rust Commands (commands.rs)
    ↓
Database/Search Engine
    ↓
Return Results
    ↓
Update UI
```

## 🗄️ Database Schema

```sql
CREATE TABLE snippets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    language TEXT NOT NULL,
    description TEXT,
    tags TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_title ON snippets(title);
CREATE INDEX idx_language ON snippets(language);
```

## 🔍 Search System

### Keyword Search
- Fast, instant results
- Searches: title, content, description, tags
- Uses SQL LIKE queries
- Case-insensitive

### Semantic Search (AI-Powered)
- Natural language understanding
- Context-aware results
- Ranking by relevance
- Requires SLM model (~600MB-1.5GB)
- Offline once model is loaded

**Future Enhancements:**
- Vector embeddings for better semantic search
- Caching of embeddings
- Incremental indexing

## 🤖 SLM Integration

**Supported Models:**
- GGUF format models (llama.cpp compatible)
- Recommended: TinyLlama 1.1B, Phi-2 2.7B

**Model Management:**
1. Download model (manual or via URL)
2. Store in `{appdata}/snippet-vault/models/`
3. Load model into memory
4. Use for semantic search

**Future Features:**
- Automatic model downloading
- Progress indicators
- Multiple model support
- Model switching
- Embedding caching

## 🎨 UI/UX Design

**Design Principles:**
- Dark theme (easy on eyes)
- Minimal, clean interface
- Focus on search and content
- Fast, responsive interactions
- Keyboard-friendly (future)

**Layout:**
- Header: Logo + New Snippet button
- Search Bar: With AI toggle
- Main Content: 
  - Left: Snippet list (scrollable)
  - Right: Snippet viewer/editor
- Modals: For model management

**Color Scheme:**
- Primary: Indigo (#6366f1)
- Background: Near-black (#0f0f0f)
- Text: Light gray (#f5f5f5)
- Accents: Purple, green, red for actions

## 🔧 Development

### Building

```bash
# Development (hot reload)
./dev.sh

# Production build
./build.sh

# Quick run
./run.sh

# Verify setup
./verify.sh
```

### Adding Features

1. **New Backend Command:**
   - Add function in `commands.rs`
   - Add to `invoke_handler!` in `main.rs`
   - Call from frontend: `invoke('command_name', { args })`

2. **New UI Feature:**
   - Update HTML in `index.html`
   - Add styles in `styles.css`
   - Add logic in `app.js`

3. **Database Changes:**
   - Modify schema in `database.rs`
   - Update models in `models.rs`
   - Migration may be needed (manual for now)

### Testing

```bash
# Check for errors
cd src-tauri
cargo check

# Run tests
cargo test

# Format code
cargo fmt

# Lint
cargo clippy
```

## 📦 Dependencies

### Rust Dependencies

```toml
tauri = "1.5"              # Desktop framework
serde = "1.0"              # Serialization
serde_json = "1.0"         # JSON handling
rusqlite = "0.31"          # SQLite database
chrono = "0.4"             # Date/time
anyhow = "1.0"             # Error handling
tokio = "1"                # Async runtime
llm = "0.1"                # Language model loading
dirs = "5.0"               # Directory paths
```

### Frontend Dependencies

```
highlight.js               # Syntax highlighting (CDN)
Tauri API                  # Backend communication
```

## 🚀 Performance

**Benchmarks (estimated):**
- App startup: <1 second
- Search (keyword): <10ms
- Search (semantic, first query): ~500ms
- Search (semantic, cached): ~100ms
- Database queries: <5ms
- UI rendering: 60 FPS

**Optimizations:**
- SQLite indexes for fast queries
- Lazy loading of snippets
- Code splitting (future)
- Embedding caching (future)
- Incremental compilation in dev

## 🛣️ Roadmap

### Phase 1: Core Features ✅
- [x] Basic CRUD operations
- [x] Keyword search
- [x] Syntax highlighting
- [x] Dark theme UI
- [x] Local SQLite storage

### Phase 2: AI Integration ✅
- [x] SLM loading infrastructure
- [x] Semantic search placeholder
- [x] Model management UI

### Phase 3: Polish (Future)
- [ ] Better SLM integration with embeddings
- [ ] Keyboard shortcuts
- [ ] Tags management
- [ ] Export/Import
- [ ] Snippet sharing
- [ ] Code execution sandbox

### Phase 4: Advanced (Future)
- [ ] Folders/Collections
- [ ] Git integration
- [ ] Cloud sync (optional)
- [ ] Team sharing
- [ ] Plugin system
- [ ] Multiple themes
- [ ] Mobile companion app

## 🤝 Contributing

Contributions welcome! Areas that need work:
1. Better SLM integration with embeddings
2. Keyboard shortcuts
3. Export/Import functionality
4. Testing suite
5. CI/CD pipeline
6. Documentation improvements
7. Icon design

## 📄 License

MIT License - Free to use and modify!

## 🙏 Acknowledgments

- **Tauri Team**: Amazing desktop framework
- **Rust Community**: Excellent libraries and support
- **Highlight.js**: Syntax highlighting
- **TheBloke**: Pre-quantized LLM models

## 📞 Support

For issues or questions:
1. Check documentation (README.md, INSTALL.md)
2. Run verification script (./verify.sh)
3. Check Tauri docs: https://tauri.app
4. Review Rust docs: https://www.rust-lang.org

---

**Built with ❤️ using Rust and Tauri**

Last Updated: October 2025
Version: 0.1.0

