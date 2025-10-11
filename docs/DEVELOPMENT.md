# NoBrainDev Development Guide

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/techbruwh/nobraindev.git
cd nobraindev

# 2. Install dependencies
cd ui && npm install && cd ..

# 3. Run development mode
# Terminal 1:
cd ui && npm run dev

# Terminal 2:
cd src-tauri && cargo tauri dev
```

## Troubleshooting

### Windows (WSL)

If using WSL, you may need to run the app from Windows terminal, not WSL bash:
```bash
cd /mnt/c/path/to/nobraindev
./dev.sh
```

### Port Already in Use

If port 1420 is already in use:
```bash
# Kill existing processes
pkill -f vite
pkill -f nobraindev
```

### Build Errors

```bash
# Clean build cache
cd src-tauri
cargo clean

# Rebuild
cargo build
```

### AI Model Issues

The AI search feature requires downloading a model (~90MB). If it fails:
```bash
# Check model directory
ls -lh ~/.local/share/snippet-vault/models/all-MiniLM-L6-v2/

# The app will show an error message if the model can't be loaded
```

## Architecture

### Frontend (React + Vite)
- `ui/src/App.jsx` - Main application component
- `ui/src/components/` - Reusable UI components
- State management with React hooks
- Styling with Tailwind CSS + shadcn/ui

### Backend (Rust + Tauri)
- `src-tauri/src/main.rs` - Application entry point
- `src-tauri/src/commands.rs` - Tauri commands (frontend↔backend bridge)
- `src-tauri/src/database.rs` - SQLite operations
- `src-tauri/src/search.rs` - AI semantic search engine
- `src-tauri/src/models.rs` - Data structures

### Database Schema
```sql
CREATE TABLE snippets (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    language TEXT NOT NULL,
    tags TEXT,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE embeddings (
    snippet_id INTEGER PRIMARY KEY,
    embedding BLOB NOT NULL,
    model_version TEXT NOT NULL,
    FOREIGN KEY (snippet_id) REFERENCES snippets(id)
);
```

## Adding New Features

### Adding a New Tauri Command

1. Define in `src-tauri/src/commands.rs`:
```rust
#[tauri::command]
pub fn my_new_command(param: String) -> Result<String, String> {
    Ok(format!("Hello, {}!", param))
}
```

2. Register in `src-tauri/src/main.rs`:
```rust
.invoke_handler(tauri::generate_handler![
    // ... existing commands
    commands::my_new_command,
])
```

3. Call from frontend:
```javascript
import { invoke } from '@tauri-apps/api/core'

const result = await invoke('my_new_command', { param: 'World' })
```

### Adding a New UI Component

```bash
# Using shadcn/ui
npx shadcn-ui@latest add <component-name>
```

## Performance Tips

- Use `cargo build --release` for production builds
- Enable code splitting in Vite for faster loading
- Optimize database queries with indexes
- Use React.memo() for expensive components

## Security Considerations

- Never expose sensitive data in frontend code
- Validate all user inputs in Rust backend
- Use Tauri's security features (CSP, allowlist)
- Keep dependencies updated

## Release Process

1. Update version in `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`
2. Update CHANGELOG.md
3. Build for all platforms:
   ```bash
   cargo tauri build
   ```
4. Test the built application
5. Create GitHub release with artifacts
6. Update documentation

## Resources

- [Tauri Documentation](https://tauri.app/v2/guides/)
- [React Documentation](https://react.dev/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

## Community

- GitHub: [@techbruwh/nobraindev](https://github.com/techbruwh/nobraindev)
- Twitter: [@techbruwh](https://twitter.com/techbruwh)

