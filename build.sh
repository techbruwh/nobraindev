#!/bin/bash

# nobraindev Build Script

echo "🔨 Building NoBrainDev for production..."
echo ""

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust is not installed. Please install Rust first:"
    echo "   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# Check if Node.js is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first:"
    echo "   https://nodejs.org/"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "src-tauri/Cargo.toml" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Install Tauri CLI if not present
if ! cargo tauri --version &> /dev/null; then
    echo "📦 Installing Tauri CLI..."
    cargo install tauri-cli
fi

# Build frontend
echo "🎨 Building frontend..."
cd ui
npm install
npm run build
cd ..

# Build Tauri app
echo ""
echo "🦀 Building Tauri backend..."
cd src-tauri
cargo tauri build

echo ""
echo "✅ Build complete!"
echo "📦 Your application bundle is in: src-tauri/target/release/bundle/"
echo ""

# Show what was built
if [ -d "target/release/bundle/deb" ]; then
    echo "📦 Built packages:"
    ls -lh target/release/bundle/deb/*.deb 2>/dev/null || true
    ls -lh target/release/bundle/appimage/*.AppImage 2>/dev/null || true
    ls -lh target/release/bundle/msi/*.msi 2>/dev/null || true
    ls -lh target/release/bundle/dmg/*.dmg 2>/dev/null || true
fi

