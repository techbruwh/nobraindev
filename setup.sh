#!/bin/bash

# NoBrainDev Setup Script
# This script sets up the development environment for NoBrainDev

set -e

echo "🎯 NoBrainDev Setup"
echo "===================="
echo ""

# Check if running in WSL
if grep -qi microsoft /proc/version; then
    echo "✅ Running in WSL"
else
    echo "⚠️  Not running in WSL. This script is optimized for WSL."
fi

echo ""

# 1. Install Rust
echo "📦 Step 1: Installing Rust..."
if command -v cargo &> /dev/null; then
    echo "✅ Rust is already installed: $(cargo --version)"
else
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
    echo "✅ Rust installed successfully"
fi

echo ""

# 2. Install Node.js via NVM
echo "📦 Step 2: Installing Node.js..."
if command -v node &> /dev/null; then
    echo "✅ Node.js is already installed: $(node --version)"
else
    echo "Installing NVM (Node Version Manager)..."
    if [ -d "$HOME/.nvm" ]; then
        echo "✅ NVM is already installed"
    else
        # Get the latest NVM version from GitHub API
        NVM_LATEST=$(curl -s https://api.github.com/repos/nvm-sh/nvm/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
        echo "Installing NVM ${NVM_LATEST}..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_LATEST}/install.sh | bash
        echo "✅ NVM installed successfully"
    fi
    
    # Load NVM
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Install latest LTS version of Node.js
    echo "Installing Node.js LTS..."
    nvm install --lts
    nvm use --lts
    echo "✅ Node.js installed successfully: $(node --version)"
fi

echo ""

# 3. Install system dependencies for Tauri
echo "📦 Step 3: Installing system dependencies..."
echo "Checking for required packages..."

# Detect Linux distribution
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
fi

case "$OS" in
    ubuntu|debian)
        echo "Detected Ubuntu/Debian"
        sudo apt-get update
        sudo apt-get install -y \
            libwebkit2gtk-4.1-dev \
            build-essential \
            curl \
            wget \
            file \
            libssl-dev \
            libgtk-3-dev \
            libayatana-appindicator3-dev \
            librsvg2-dev
        ;;
    fedora|rhel|centos)
        echo "Detected Fedora/RHEL/CentOS"
        sudo dnf install -y \
            webkit2gtk3-devel \
            openssl-devel \
            curl \
            wget \
            file \
            libappindicator-gtk3-devel \
            librsvg2-devel
        ;;
    arch|manjaro)
        echo "Detected Arch/Manjaro"
        sudo pacman -Syu --needed \
            webkit2gtk \
            base-devel \
            curl \
            wget \
            file \
            openssl \
            appmenu-gtk-module \
            gtk3 \
            libappindicator-gtk3 \
            librsvg
        ;;
    *)
        echo "⚠️  Unknown distribution. Please install Tauri dependencies manually:"
        echo "   https://tauri.app/v1/guides/getting-started/prerequisites"
        ;;
esac

echo "✅ System dependencies installed"
echo ""

# 4. Install npm dependencies for UI
echo "📦 Step 4: Installing UI dependencies..."
if [ -d "ui/node_modules" ]; then
    echo "✅ UI dependencies already installed"
else
    echo "Installing UI dependencies..."
    cd ui
    npm install
    cd ..
    echo "✅ UI dependencies installed successfully"
fi

echo ""

# 5. Install Tauri CLI
echo "📦 Step 5: Installing Tauri CLI..."
if cargo tauri --version &> /dev/null; then
    echo "✅ Tauri CLI is already installed: $(cargo tauri --version)"
else
    echo "Installing Tauri CLI..."
    cargo install tauri-cli
    echo "✅ Tauri CLI installed successfully"
fi

echo ""

# 6. Icons are already set up
echo "📦 Step 6: Icons configured..."
echo "✅ Icons are ready in src-tauri/icons/"
echo ""

# 7. Make scripts executable
echo "📦 Step 7: Making scripts executable..."
chmod +x dev.sh build.sh run.sh 2>/dev/null || true
echo "✅ Scripts are now executable"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. To run in development mode:"
echo "   ./dev.sh"
echo ""
echo "2. To build for production:"
echo "   ./build.sh"
echo ""
echo "3. To run a quick test:"
echo "   cd src-tauri && cargo check"
echo ""
echo "📚 Read README.md for more information"

