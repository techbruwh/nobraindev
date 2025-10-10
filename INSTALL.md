# Installation Guide

## Quick Start

### Prerequisites

- **WSL (Windows Subsystem for Linux)** - Already set up ✅
- **Ubuntu/Debian** on WSL (recommended)
- Internet connection for downloading dependencies

### Automated Setup

Run the setup script to install all dependencies:

```bash
cd /mnt/c/Users/llois/app/snippet-vault
chmod +x setup.sh
./setup.sh
```

This will install:
- Rust and Cargo
- Tauri CLI
- Required system libraries (webkit2gtk, etc.)

### Manual Setup

If you prefer manual installation:

#### 1. Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

#### 2. Install System Dependencies

**For Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y \
    libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

**For Fedora:**
```bash
sudo dnf install -y \
    webkit2gtk3-devel \
    openssl-devel \
    curl \
    wget \
    file \
    libappindicator-gtk3-devel \
    librsvg2-devel
```

**For Arch:**
```bash
sudo pacman -Syu --needed \
    webkit2gtk \
    base-devel \
    curl \
    wget \
    file \
    openssl \
    gtk3 \
    libappindicator-gtk3 \
    librsvg
```

#### 3. Install Tauri CLI

```bash
cargo install tauri-cli
```

## Running the Application

### Development Mode

```bash
./dev.sh
```

Or manually:
```bash
cd src-tauri
cargo tauri dev
```

### Production Build

```bash
./build.sh
```

Or manually:
```bash
cd src-tauri
cargo tauri build
```

The compiled application will be in: `src-tauri/target/release/bundle/`

### Quick Run (without Tauri)

```bash
./run.sh
```

Or manually:
```bash
cd src-tauri
cargo run --release
```

## Troubleshooting

### "cargo: command not found"

Rust isn't installed or not in PATH. Run:
```bash
source $HOME/.cargo/env
```

Or install Rust:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### "webkit2gtk not found"

Install system dependencies:
```bash
sudo apt-get install libwebkit2gtk-4.0-dev
```

### Build errors

1. Update Rust:
```bash
rustup update
```

2. Clean and rebuild:
```bash
cd src-tauri
cargo clean
cargo build
```

### WSL Display Issues

If you're running the app in WSL and want to display on Windows, you'll need an X server like VcXsrv or WSLg (Windows 11).

For Windows 11 with WSLg, it should work out of the box.

For Windows 10:
1. Install VcXsrv
2. Set DISPLAY:
```bash
export DISPLAY=:0
```

### Icons Missing

Generate icons from a 1024x1024 PNG:
```bash
cargo tauri icon path/to/icon.png
```

## Checking Installation

Verify everything is set up correctly:

```bash
# Check Rust
cargo --version
rustc --version

# Check Tauri CLI
cargo tauri --version

# Check if project compiles
cd src-tauri
cargo check
```

## Building for Distribution

### Windows (from WSL)

```bash
cargo tauri build --target x86_64-pc-windows-msvc
```

The installer will be in: `src-tauri/target/release/bundle/msi/`

### Linux

```bash
cargo tauri build
```

The AppImage will be in: `src-tauri/target/release/bundle/appimage/`

## Next Steps

Once installed, refer to [README.md](README.md) for:
- How to use the application
- Feature documentation
- Development guidelines
- Contributing

## Getting Help

If you encounter issues:
1. Check the [Tauri documentation](https://tauri.app/v1/guides/)
2. Check Rust installation: `rustup show`
3. Verify system dependencies are installed
4. Try a clean build: `cargo clean && cargo build`

## Performance Tips

For faster builds during development:

```bash
# Use mold linker (Linux)
sudo apt-get install mold
export RUSTFLAGS="-C link-arg=-fuse-ld=mold"

# Or use lld
export RUSTFLAGS="-C link-arg=-fuse-ld=lld"
```

Add to `.cargo/config.toml` in the project:
```toml
[target.x86_64-unknown-linux-gnu]
linker = "clang"
rustflags = ["-C", "link-arg=-fuse-ld=mold"]
```

