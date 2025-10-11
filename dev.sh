#!/bin/bash

# NoBrainDev Development Script
# Just run this and start coding!

set -e

echo "🧠 Starting NoBrainDev in development mode..."
echo ""

# Check prerequisites
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install from: https://nodejs.org/"
    exit 1
fi

if ! command -v cargo &> /dev/null; then
    echo "❌ Rust not found. Install from: https://rustup.rs/"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "src-tauri/Cargo.toml" ]; then
    echo "❌ Please run this from the project root directory"
    exit 1
fi

# Install frontend dependencies if needed
if [ ! -d "ui/node_modules" ]; then
    echo "📦 Installing dependencies..."
    cd ui && npm install && cd ..
fi

# Kill any existing processes
pkill -f "vite" 2>/dev/null || true
pkill -f "snippet-vault" 2>/dev/null || true
sleep 1

echo "🎨 Starting frontend dev server..."
cd ui
npm run dev &
VITE_PID=$!
cd ..

# Wait for Vite to be ready
echo "⏳ Waiting for frontend..."
sleep 5

echo "🦀 Starting Tauri app..."
cd src-tauri
cargo tauri dev &
TAURI_PID=$!
cd ..

echo ""
echo "✅ NoBrainDev is running!"
echo ""
echo "📝 Edit files and they'll reload automatically"
echo "🛑 Press Ctrl+C to stop"
echo ""

# Trap Ctrl+C and cleanup
trap 'echo ""; echo "🛑 Stopping..."; kill $VITE_PID $TAURI_PID 2>/dev/null; exit 0' INT

# Wait
wait
