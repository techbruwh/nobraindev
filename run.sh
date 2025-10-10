#!/bin/bash

# Quick run script for SnippetVault

cd "$(dirname "$0")"

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust is not installed. Please run ./setup.sh first"
    exit 1
fi

echo "🚀 Running SnippetVault..."
cd src-tauri
cargo run --release

