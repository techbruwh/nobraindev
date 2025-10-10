#!/bin/bash

# SnippetVault Build Script

echo "🔨 Building SnippetVault for production..."
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

# Build for production
echo "🔧 Building release version..."
echo ""
cargo tauri build

echo ""
echo "✅ Build complete!"
echo "📦 Your application bundle is in: src-tauri/target/release/bundle/"

