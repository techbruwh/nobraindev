# SnippetVault 🗃️

A beautiful, local-first code snippet manager with AI-powered semantic search built with Tauri and Rust.

## Features

✨ **Local-First**: All your snippets stored locally in SQLite  
🔍 **Smart Search**: Keyword search + AI-powered semantic search  
🎨 **Modern UI**: Clean, dark-themed interface with syntax highlighting  
🚀 **Fast & Lightweight**: Built with Rust and Tauri  
💾 **Code Support**: Support for 20+ programming languages  
🤖 **SLM Integration**: Use Small Language Models for intelligent snippet discovery  

## Getting Started

### Prerequisites

- Rust (latest stable)
- Node.js (optional, for development)
- WSL (if on Windows)

### Building

1. Navigate to the project directory:
```bash
cd /mnt/c/Users/llois/app/snippet-vault
```

2. Build the application:
```bash
cd src-tauri
cargo build
```

3. Run in development mode:
```bash
cargo tauri dev
```

4. Build for production:
```bash
cargo tauri build
```

### Using the Application

#### Creating Snippets

1. Click the "New Snippet" button
2. Fill in:
   - Title: A descriptive name
   - Language: Select from 20+ languages
   - Tags: Comma-separated tags (optional)
   - Description: Brief description (optional)
   - Code: Your actual code snippet
3. Click "Save"

#### Searching Snippets

**Keyword Search** (Default):
- Type in the search bar to search by title, content, description, or tags
- Fast, instant results

**Semantic Search** (AI-Powered):
1. Load a language model (see below)
2. Click the "AI" button to enable semantic search
3. Search using natural language queries like:
   - "How to parse JSON in Python"
   - "React component for user authentication"
   - "SQL query to get top 10 users"

#### Loading an AI Model

1. Click on the model status indicator
2. Choose one of these options:
   - **Browse**: Select a local GGUF model file
   - **Download**: Use a recommended model (TinyLlama or Phi-2)
3. Click "Download & Load Model"

**Recommended Models:**
- TinyLlama 1.1B (~600MB) - Fast, lightweight
- Phi-2 2.7B (~1.5GB) - More accurate

You can download GGUF models from:
- [Hugging Face](https://huggingface.co/models?search=gguf)
- [TheBloke's Models](https://huggingface.co/TheBloke)

### Project Structure

```
snippet-vault/
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs        # Application entry point
│   │   ├── database.rs    # SQLite database layer
│   │   ├── models.rs      # Data models
│   │   ├── commands.rs    # Tauri commands
│   │   └── search.rs      # Search engine & SLM integration
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
└── ui/                     # Frontend
    ├── index.html         # Main UI
    ├── styles.css         # Styling
    └── app.js             # JavaScript logic
```

## Technology Stack

**Backend:**
- Rust
- Tauri (Desktop framework)
- SQLite (rusqlite)
- LLM (for model loading)

**Frontend:**
- Vanilla JavaScript
- HTML5/CSS3
- Highlight.js (syntax highlighting)

## Features in Detail

### Database

Snippets are stored in a local SQLite database with the following schema:
- Title, Content, Language
- Description, Tags
- Created/Updated timestamps
- Indexed for fast search

### Search Engine

**Keyword Search:**
- Full-text search across all fields
- Case-insensitive
- Instant results

**Semantic Search (with SLM):**
- Natural language queries
- Understands intent and context
- Ranks results by relevance
- Works offline once model is loaded

### UI Features

- **Dark Theme**: Easy on the eyes
- **Syntax Highlighting**: 20+ languages supported
- **Code Copy**: One-click copy to clipboard
- **Responsive Design**: Adapts to window size
- **Keyboard Shortcuts**: Fast navigation

## Future Enhancements

- [ ] Tags management system
- [ ] Export/Import snippets
- [ ] Snippet sharing (QR code, link)
- [ ] Folders/Collections
- [ ] Code execution (sandbox)
- [ ] Git integration
- [ ] Cloud sync (optional)
- [ ] Better SLM integration with embeddings
- [ ] Multi-language support
- [ ] Keyboard shortcuts

## Development

### Adding New Languages

Edit `ui/index.html` and add to the `<select id="editLanguage">` options:
```html
<option value="newlang">New Language</option>
```

### Customizing Theme

Edit `ui/styles.css` and modify the CSS variables in `:root`:
```css
:root {
    --primary: #6366f1;
    --bg-primary: #0f0f0f;
    /* ... */
}
```

## Troubleshooting

**Database not found:**
- The database is created automatically in your app data directory
- Windows: `%LOCALAPPDATA%\snippet-vault\`
- Linux: `~/.local/share/snippet-vault/`
- macOS: `~/Library/Application Support/snippet-vault/`

**Model not loading:**
- Ensure the model file is in GGUF format
- Check file permissions
- Models are stored in: `{appdata}/snippet-vault/models/`

**Build errors:**
- Ensure Rust is up to date: `rustup update`
- Clean build: `cargo clean && cargo build`

## License

MIT License - Feel free to use and modify!

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## Acknowledgments

- Tauri team for the amazing framework
- Highlight.js for syntax highlighting
- The Rust community

