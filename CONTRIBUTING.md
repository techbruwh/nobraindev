# Contributing to NoBrainDev

Thanks for contributing! 🎉

## Quick Start

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/nobraindev.git
cd nobraindev

# 2. Install dependencies
cd ui && npm install && cd ..

# 3. Run dev mode
./dev.sh
```

That's it! The app will open and reload on changes.

## Prerequisites (macOS)

Install these:

- **Node.js** (v18+) - [nodejs.org](https://nodejs.org/)
- **Rust** - [rustup.rs](https://rustup.rs/)
- **Xcode Command Line Tools**:
  ```bash
  xcode-select --install
  ```

## Development Setup

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/nobraindev.git
cd nobraindev

# 2. Install dependencies  
cd ui && npm install && cd ..

# 3. Run dev mode
./dev.sh
```

## Development Workflow

### Running the App in Development Mode

**Two Terminals Approach:**

Terminal 1 - Start frontend dev server:
```bash
cd ui
npm run dev
```

Terminal 2 - Start Tauri app:
```bash
cd src-tauri
cargo tauri dev
```

**Quick Script:**
```bash
./dev.sh
```

### Project Structure

```
nobraindev/
├── src-tauri/           # Rust backend
│   ├── src/
│   │   ├── main.rs      # Entry point
│   │   ├── commands.rs  # Tauri commands
│   │   ├── database.rs  # SQLite operations
│   │   ├── search.rs    # AI search engine
│   │   └── models.rs    # Data models
│   ├── Cargo.toml       # Rust dependencies
│   └── tauri.conf.json  # Tauri configuration
├── ui/                  # React frontend
│   ├── src/
│   │   ├── App.jsx      # Main component
│   │   ├── components/  # UI components
│   │   └── main.jsx     # Entry point
│   ├── package.json
│   └── vite.config.js
└── README.md
```

### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. **Make your changes**
   - Write clear, concise code
   - Follow the existing code style
   - Add comments for complex logic

3. **Test your changes**
   ```bash
   # Run the app
   cd ui && npm run dev
   # In another terminal
   cd src-tauri && cargo tauri dev
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature" # Use conventional commits
   ```

## Code Style

### Rust Code

- Follow [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- Use `cargo fmt` before committing
- Run `cargo clippy` and fix warnings
- Write descriptive error messages

```bash
cargo fmt
cargo clippy
```

### JavaScript/React Code

- Use ESLint and Prettier (configured in the project)
- Use functional components with hooks
- Use meaningful variable names
- Keep components small and focused

```bash
npm run lint
npm run format
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add semantic search with AI model
fix: resolve issue with snippet deletion
docs: update installation instructions
```

## Testing

### Manual Testing

1. Create, edit, and delete snippets
2. Test search functionality (both keyword and AI)
3. Test on your target platform (Windows/macOS/Linux)
4. Check for console errors in DevTools (F12)

### Building for Production

```bash
cd src-tauri
cargo tauri build
```

The built application will be in `src-tauri/target/release/bundle/`

## Submitting Changes

### Before Submitting

- [ ] Code follows the project's style guidelines
- [ ] Code compiles without errors or warnings
- [ ] Changes have been tested locally
- [ ] Commit messages follow conventional commits
- [ ] Documentation has been updated (if needed)

### Pull Request Process

1. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request** on GitHub
   - Use a clear, descriptive title
   - Fill out the PR template
   - Link any related issues

3. **Wait for Review**
   - Maintainers will review your PR
   - Address any requested changes
   - Keep the conversation friendly and constructive

4. **Merge**
   - Once approved, a maintainer will merge your PR
   - Your contribution will be in the next release! 🎉

## Need Help?

- 💬 [GitHub Discussions](https://github.com/techbruwh/nobraindev/discussions)
- 🐛 [Open an Issue](https://github.com/techbruwh/nobraindev/issues)
- 📧 Email: contribute@techbruwh.com

## Thank You! 🙏

Every contribution, no matter how small, is appreciated. Thank you for helping make NoBrainDev better!

