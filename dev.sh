#!/bin/bash

# SnippetVault Development Script

echo "🚀 Starting SnippetVault in development mode..."
echo ""

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust is not installed. Please install Rust first:"
    echo "   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "src-tauri/Cargo.toml" ]; then
    echo "❌ Error: Please run this script from the snippet-vault directory"
    exit 1
fi

# Navigate to src-tauri directory
cd src-tauri

# Install Tauri CLI if not present
if ! cargo tauri --version &> /dev/null; then
    echo "📦 Installing Tauri CLI..."
    cargo install tauri-cli
fi

# Run development server
echo "🔧 Building and running..."
echo ""
cargo tauri dev

