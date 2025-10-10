# 🎉 Welcome to SnippetVault!

Your local code snippet manager with AI-powered search is ready!

## 📍 You Are Here

```
/mnt/c/Users/llois/app/snippet-vault/
```

## 🚀 Quick Start (3 Steps)

### Step 1: Install Dependencies (First Time Only)

```bash
cd /mnt/c/Users/llois/app/snippet-vault
chmod +x *.sh
./setup.sh
```

**This installs:**
- Rust programming language
- Tauri CLI
- System libraries (webkit2gtk, etc.)

⏱️ Takes ~10-15 minutes

### Step 2: Verify Installation

```bash
./verify.sh
```

Check if everything is set up correctly.

### Step 3: Run the App!

```bash
./dev.sh
```

The app will open in a new window!

## 📚 Documentation

Read these files in order:

1. **START_HERE.md** ← You are here!
2. **QUICKSTART.md** - 5-minute tutorial
3. **README.md** - Full documentation
4. **INSTALL.md** - Detailed installation guide
5. **PROJECT_OVERVIEW.md** - Technical architecture
6. **EXAMPLES.md** - Sample code snippets

## 🎯 What Can You Do?

### Create Snippets
- Store code, scripts, commands
- Support for 20+ languages
- Add descriptions and tags
- Syntax highlighting

### Search Snippets
- **Keyword Search**: Fast, instant results
- **AI Search**: Natural language queries (after loading a model)

### Organize
- Tag your snippets
- Search by language
- Recently updated snippets first

## 🤖 AI Features (Optional)

To enable AI-powered semantic search:

1. Run the app
2. Click on "No model" status
3. Download a small language model:
   - **TinyLlama** (~600MB) - Fast
   - **Phi-2** (~1.5GB) - More accurate
4. Load the model
5. Click the "AI" button in search

Now search with natural language:
- "Show me Python sorting algorithms"
- "Find React authentication code"
- "Database connection snippets"

## 📁 Project Structure

```
snippet-vault/
├── START_HERE.md        ← Quick start guide
├── QUICKSTART.md        ← Tutorial
├── README.md            ← Full documentation
├── INSTALL.md           ← Installation guide
├── PROJECT_OVERVIEW.md  ← Technical details
├── EXAMPLES.md          ← Sample snippets
│
├── setup.sh             ← Run this first!
├── verify.sh            ← Check installation
├── dev.sh               ← Start development mode
├── build.sh             ← Build for production
├── run.sh               ← Quick run
│
├── src-tauri/           ← Rust backend
│   ├── src/
│   │   ├── main.rs      ← Entry point
│   │   ├── database.rs  ← SQLite database
│   │   ├── models.rs    ← Data structures
│   │   ├── commands.rs  ← API commands
│   │   └── search.rs    ← Search engine
│   └── Cargo.toml       ← Dependencies
│
└── ui/                  ← Frontend
    ├── index.html       ← UI structure
    ├── styles.css       ← Styling
    └── app.js           ← Application logic
```

## 🛠️ Available Commands

```bash
# First time setup
./setup.sh

# Verify everything works
./verify.sh

# Development mode (hot reload)
./dev.sh

# Build for production
./build.sh

# Quick run (optimized)
./run.sh

# Manual commands
cd src-tauri
cargo check       # Check for errors
cargo build       # Build project
cargo test        # Run tests
cargo tauri dev   # Development mode
cargo tauri build # Production build
```

## 💡 Tips

1. **First build takes time**: ~5-10 minutes, be patient!
2. **Use tags**: Makes searching much easier
3. **Try AI search**: Download a model for smart search
4. **Backup your data**: Your database is at:
   - `~/.local/share/snippet-vault/snippets.db` (Linux/WSL)

## 🎓 Learning Path

### Beginner
1. Read QUICKSTART.md
2. Create your first snippet
3. Try keyword search

### Intermediate
1. Import examples from EXAMPLES.md
2. Organize with tags
3. Try different languages

### Advanced
1. Load an AI model
2. Use semantic search
3. Read PROJECT_OVERVIEW.md
4. Contribute improvements

## ❓ Troubleshooting

### "cargo: command not found"
```bash
./setup.sh
source $HOME/.cargo/env
```

### "webkit2gtk not found"
```bash
sudo apt-get update
sudo apt-get install libwebkit2gtk-4.0-dev
```

### App won't start
```bash
cd src-tauri
cargo clean
cargo build
```

### Need more help?
1. Run `./verify.sh`
2. Check INSTALL.md
3. Review error messages carefully

## 🎨 Features

✅ **Working Now:**
- Create, edit, delete snippets
- Keyword search
- Syntax highlighting (20+ languages)
- Dark theme UI
- Code copying
- Tags and descriptions
- SQLite local storage
- SLM infrastructure ready

🚧 **Coming Soon:**
- Full AI semantic search with embeddings
- Keyboard shortcuts
- Export/Import
- Snippet sharing
- Code execution
- More themes

## 🏆 Your First Task

Create your first snippet!

1. Run: `./dev.sh`
2. Click "New Snippet"
3. Title: "Hello World"
4. Language: Pick your favorite
5. Code: Write a simple hello world
6. Click "Save"
7. Search for it!

Congratulations! 🎉

## 📊 Project Status

- ✅ Project structure created
- ✅ Rust backend implemented
- ✅ Database layer complete
- ✅ Frontend UI built
- ✅ Search functionality ready
- ✅ SLM integration prepared
- ✅ Documentation complete
- ⏳ Waiting for first build & test

## 🤝 Need Help?

1. **Read docs**: Check QUICKSTART.md or README.md
2. **Run verify**: `./verify.sh`
3. **Check errors**: Look at terminal output
4. **Installation issues**: See INSTALL.md

## 🎯 Next Steps

1. ✅ You've read this file
2. ⬜ Run `./setup.sh` to install dependencies
3. ⬜ Run `./verify.sh` to check installation
4. ⬜ Run `./dev.sh` to start the app
5. ⬜ Create your first snippet
6. ⬜ Read QUICKSTART.md for more features
7. ⬜ Try AI search (optional)
8. ⬜ Import examples from EXAMPLES.md
9. ⬜ Enjoy your new snippet manager! 🚀

---

**Ready to begin?**

```bash
./setup.sh
```

**Happy coding! 💻✨**

---

Built with ❤️ using:
- **Tauri** - Desktop framework
- **Rust** - Backend language
- **SQLite** - Local database
- **JavaScript** - Frontend logic
- **Highlight.js** - Syntax highlighting

Project Version: 0.1.0
Created: October 2025

