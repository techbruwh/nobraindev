# Quick Start Guide

Get SnippetVault up and running in 5 minutes!

## 🚀 Installation (First Time)

### Step 1: Navigate to the project

```bash
cd /mnt/c/Users/llois/app/snippet-vault
```

### Step 2: Run the setup script

```bash
chmod +x setup.sh verify.sh
./setup.sh
```

This will automatically install:
- Rust toolchain
- Tauri CLI
- Required system libraries

⏱️ **Time:** ~10-15 minutes (depending on your internet speed)

### Step 3: Verify installation

```bash
./verify.sh
```

This checks if everything is installed correctly.

## 🎮 Running the App

### Development Mode (Hot Reload)

```bash
./dev.sh
```

This starts the app in development mode with hot-reloading.

### Production Mode

```bash
./run.sh
```

Runs the optimized release version.

### Build Installer

```bash
./build.sh
```

Creates an installable package in `src-tauri/target/release/bundle/`

## 📝 Your First Snippet

Once the app opens:

1. **Click "New Snippet"** button (top right)

2. **Fill in the details:**
   - **Title:** "Hello World in Python"
   - **Language:** Select "Python"  
   - **Code:** 
     ```python
     def hello():
         print("Hello, World!")
     
     if __name__ == "__main__":
         hello()
     ```

3. **Click "Save"**

4. **Search for it:** Type "hello" or "print" in the search bar

## 🤖 Setting Up AI Search (Optional)

1. **Click on "No model" status** (bottom of search bar)

2. **Choose a model:**
   - For quick start: Download TinyLlama (~600MB)
   - For better results: Download Phi-2 (~1.5GB)

3. **Browse to model file** or enter URL

4. **Click "Download & Load Model"**

5. **Enable AI search:** Click the "AI" button in search bar

Now you can search with natural language like:
- "Show me Python functions"
- "Find database queries"
- "Authentication code"

## 🎯 Common Tasks

### Adding a Snippet
- Click "New Snippet" or press `Ctrl+N` (future feature)
- Paste your code
- Add title and select language
- Click "Save"

### Searching
- **Keyword search:** Just type in the search bar
- **AI search:** Enable AI mode and use natural language

### Editing a Snippet
- Click on a snippet in the list
- Click "Edit" button
- Make changes
- Click "Save"

### Deleting a Snippet
- Click on a snippet
- Click "Delete" button
- Confirm deletion

## 📍 Data Location

Your snippets are stored locally at:
- **Linux/WSL:** `~/.local/share/snippet-vault/snippets.db`
- **Windows:** `%LOCALAPPDATA%\snippet-vault\snippets.db`
- **macOS:** `~/Library/Application Support/snippet-vault/snippets.db`

## 🔧 Troubleshooting

### App won't start

```bash
cd src-tauri
cargo clean
cargo build
```

### "webkit2gtk not found"

```bash
sudo apt-get install libwebkit2gtk-4.0-dev
```

### Build is slow

First build takes longer (~5-10 minutes). Subsequent builds are much faster.

### Display issues in WSL

Make sure you're using Windows 11 with WSLg, or install an X server like VcXsrv for Windows 10.

## 🎓 Learning More

- **Full documentation:** See [README.md](README.md)
- **Installation guide:** See [INSTALL.md](INSTALL.md)
- **Tauri docs:** https://tauri.app
- **Rust docs:** https://www.rust-lang.org/learn

## 💡 Tips

1. **Use descriptive titles** for easier searching
2. **Add tags** to organize snippets by project or category
3. **Add descriptions** to provide context for complex code
4. **Use the right language** for proper syntax highlighting
5. **Back up your database** regularly (just copy the .db file)

## 🚦 Development Workflow

```bash
# Make changes to code
# ...

# Hot reload will update automatically in dev mode
./dev.sh

# Or manually rebuild
cd src-tauri
cargo build
```

## 🎨 Customizing

### Change theme colors

Edit `ui/styles.css` and modify the CSS variables:

```css
:root {
    --primary: #6366f1;  /* Change this */
    --bg-primary: #0f0f0f;
    /* etc. */
}
```

### Add new languages

Edit `ui/index.html` in the language dropdown:

```html
<option value="mylang">My Language</option>
```

## ✨ Features to Try

- ✅ Create, edit, delete snippets
- ✅ Syntax highlighting for 20+ languages
- ✅ Keyword search
- ✅ AI-powered semantic search
- ✅ Dark theme
- ✅ Code copying
- ✅ Tags and descriptions
- ✅ Multiple languages support

## 🤝 Need Help?

If you're stuck:
1. Run `./verify.sh` to check your setup
2. Check [INSTALL.md](INSTALL.md) for detailed troubleshooting
3. Review the console output for error messages

---

**Happy coding! 🎉**

Now you have a powerful local snippet manager with AI capabilities!

