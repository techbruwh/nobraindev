#!/bin/bash

# Verification script to check project structure and dependencies

echo "🔍 Verifying SnippetVault Project Structure"
echo "==========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1 (missing)"
        return 1
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/"
        return 0
    else
        echo -e "${RED}✗${NC} $1/ (missing)"
        return 1
    fi
}

echo "📁 Checking Project Structure..."
echo ""

# Core files
check_file "README.md"
check_file "INSTALL.md"
check_file ".gitignore"

# Scripts
check_file "setup.sh"
check_file "dev.sh"
check_file "build.sh"
check_file "run.sh"

echo ""

# Rust backend
echo "🦀 Checking Rust Backend..."
check_dir "src-tauri"
check_file "src-tauri/Cargo.toml"
check_file "src-tauri/tauri.conf.json"
check_file "src-tauri/build.rs"

# Rust source files
check_file "src-tauri/src/main.rs"
check_file "src-tauri/src/database.rs"
check_file "src-tauri/src/models.rs"
check_file "src-tauri/src/commands.rs"
check_file "src-tauri/src/search.rs"

echo ""

# Frontend
echo "🎨 Checking Frontend..."
check_dir "ui"
check_file "ui/index.html"
check_file "ui/styles.css"
check_file "ui/app.js"

echo ""

# Check tools
echo "🛠️  Checking Development Tools..."
echo ""

if command -v cargo &> /dev/null; then
    echo -e "${GREEN}✓${NC} Rust: $(cargo --version)"
else
    echo -e "${RED}✗${NC} Rust not installed. Run ./setup.sh"
fi

if command -v rustc &> /dev/null; then
    echo -e "${GREEN}✓${NC} Rust Compiler: $(rustc --version)"
fi

if cargo tauri --version &> /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Tauri CLI: $(cargo tauri --version 2>&1)"
else
    echo -e "${YELLOW}⚠${NC} Tauri CLI not installed. Run ./setup.sh"
fi

echo ""

# Check system dependencies (Linux)
echo "📦 Checking System Dependencies..."
echo ""

check_pkg() {
    if dpkg -l | grep -q "^ii  $1 "; then
        echo -e "${GREEN}✓${NC} $1"
    elif command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${YELLOW}⚠${NC} $1 (may be required)"
    fi
}

if command -v dpkg &> /dev/null; then
    check_pkg "libwebkit2gtk-4.0-dev"
    check_pkg "build-essential"
    check_pkg "libssl-dev"
else
    echo -e "${YELLOW}⚠${NC} Not a Debian/Ubuntu system, skipping package check"
fi

echo ""

# Try compiling
echo "🔨 Testing Compilation..."
echo ""

if command -v cargo &> /dev/null; then
    cd src-tauri
    if cargo check 2>&1 | tail -5; then
        echo ""
        echo -e "${GREEN}✓${NC} Project compiles successfully!"
    else
        echo ""
        echo -e "${RED}✗${NC} Compilation errors detected"
        echo "   Run: cd src-tauri && cargo check"
    fi
    cd ..
else
    echo -e "${YELLOW}⚠${NC} Cannot test compilation - Rust not installed"
fi

echo ""
echo "=========================================="
echo "Verification Complete!"
echo ""
echo "📖 Next Steps:"
echo "   1. If Rust is not installed, run: ./setup.sh"
echo "   2. To start development: ./dev.sh"
echo "   3. To build for production: ./build.sh"
echo ""

