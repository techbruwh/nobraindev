# Release Guide for NoBrainDev

This guide explains how to create and publish releases for NoBrainDev.

## 📋 Prerequisites

- [ ] GitHub repository set up at `techbruwh/nobraindev`
- [ ] Write access to the repository
- [ ] All platforms available for building (or use CI/CD)
- [ ] Git installed and configured

## 🚀 Release Process

### Step 1: Update Version Numbers

Update the version in **two places**:

**1. `src-tauri/Cargo.toml`:**
```toml
[package]
name = "snippet-vault"
version = "0.2.0"  # Update this
# ...
```

**2. `src-tauri/tauri.conf.json`:**
```json
{
  "productName": "NoBrainDev",
  "version": "0.2.0",  # Update this
  // ...
}
```

### Step 2: Update Changelog

Create/update `CHANGELOG.md`:

```markdown
# Changelog

## [0.2.0] - 2025-01-15

### Added
- New feature X
- New feature Y

### Fixed
- Bug fix A
- Bug fix B

### Changed
- Improvement C
```

### Step 3: Commit Version Changes

```bash
git add src-tauri/Cargo.toml src-tauri/tauri.conf.json CHANGELOG.md
git commit -m "chore: bump version to 0.2.0"
git push origin main
```

### Step 4: Build for All Platforms

#### 🪟 Windows Build

On a Windows machine:

```bash
# Install dependencies (first time only)
npm install -g @tauri-apps/cli

# Build
cd ui && npm install && npm run build
cd ../src-tauri
cargo tauri build
```

**Output files** will be in:
- `src-tauri/target/release/bundle/msi/NoBrainDev_0.2.0_x64_en-US.msi`
- `src-tauri/target/release/bundle/nsis/NoBrainDev_0.2.0_x64-setup.exe`

#### 🍎 macOS Build

On a macOS machine:

```bash
# Build
cd ui && npm install && npm run build
cd ../src-tauri
cargo tauri build

# Sign the app (optional, for distribution)
# codesign -s "Developer ID Application: Your Name" "target/release/bundle/macos/NoBrainDev.app"
```

**Output files** will be in:
- `src-tauri/target/release/bundle/dmg/NoBrainDev_0.2.0_aarch64.dmg` (Apple Silicon)
- `src-tauri/target/release/bundle/dmg/NoBrainDev_0.2.0_x64.dmg` (Intel)

#### 🐧 Linux Build (Ubuntu/Debian)

On a Linux machine:

```bash
# Install dependencies (first time only)
sudo apt update
sudo apt install -y libwebkit2gtk-4.0-dev \
  build-essential curl wget file \
  libssl-dev libgtk-3-dev \
  libayatana-appindicator3-dev librsvg2-dev

# Build
cd ui && npm install && npm run build
cd ../src-tauri
cargo tauri build
```

**Output files** will be in:
- `src-tauri/target/release/bundle/deb/nobraindev_0.2.0_amd64.deb`
- `src-tauri/target/release/bundle/appimage/nobraindev_0.2.0_amd64.AppImage`

### Step 5: Create GitHub Release

#### Option A: Using GitHub Web Interface

1. Go to `https://github.com/techbruwh/nobraindev/releases`
2. Click **"Draft a new release"**
3. Click **"Choose a tag"** → Type `v0.2.0` → Click **"Create new tag"**
4. Set **Release title**: `v0.2.0 - Release Name`
5. Add **Release notes** (copy from CHANGELOG.md)
6. **Upload binaries**:
   - Drag and drop all the built files (.msi, .dmg, .deb, .AppImage)
7. Check **"Set as the latest release"**
8. Click **"Publish release"**

#### Option B: Using GitHub CLI

```bash
# Install GitHub CLI (first time only)
# Windows: winget install GitHub.cli
# macOS: brew install gh
# Linux: sudo apt install gh

# Login
gh auth login

# Create release
gh release create v0.2.0 \
  --title "v0.2.0 - Release Name" \
  --notes-file CHANGELOG.md \
  src-tauri/target/release/bundle/msi/*.msi \
  src-tauri/target/release/bundle/dmg/*.dmg \
  src-tauri/target/release/bundle/deb/*.deb \
  src-tauri/target/release/bundle/appimage/*.AppImage
```

## 🤖 Automated Releases with GitHub Actions

For automated cross-platform builds, create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    strategy:
      matrix:
        platform: [macos-latest, ubuntu-latest, windows-latest]

    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Install dependencies (Ubuntu only)
        if: matrix.platform == 'ubuntu-latest'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.0-dev \
            build-essential curl wget file \
            libssl-dev libgtk-3-dev \
            libayatana-appindicator3-dev librsvg2-dev

      - name: Install frontend dependencies
        run: cd ui && npm install

      - name: Build frontend
        run: cd ui && npm run build

      - name: Build Tauri app
        run: cd src-tauri && cargo tauri build

      - name: Upload Release Assets
        uses: softprops/action-gh-release@v1
        with:
          files: |
            src-tauri/target/release/bundle/msi/*.msi
            src-tauri/target/release/bundle/dmg/*.dmg
            src-tauri/target/release/bundle/deb/*.deb
            src-tauri/target/release/bundle/appimage/*.AppImage
            src-tauri/target/release/bundle/nsis/*.exe
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**To use GitHub Actions:**

1. Commit the workflow file
2. Push a tag: `git tag v0.2.0 && git push origin v0.2.0`
3. GitHub will automatically build for all platforms and create a release!

## 📦 Release Checklist

Before publishing a release:

- [ ] Version numbers updated in both files
- [ ] CHANGELOG.md updated with changes
- [ ] All changes committed and pushed
- [ ] Built and tested on all target platforms
- [ ] No critical bugs or security issues
- [ ] Documentation updated if needed
- [ ] Tag created and pushed
- [ ] Release notes written
- [ ] Binaries uploaded to GitHub release
- [ ] Release published and marked as latest

## 🎯 Quick Release Commands

```bash
# 1. Update version (manually edit files)

# 2. Commit changes
git add .
git commit -m "chore: release v0.2.0"

# 3. Create and push tag
git tag v0.2.0
git push origin main
git push origin v0.2.0

# 4. Build (on each platform)
./build.sh  # or use the build script

# 5. Create release
gh release create v0.2.0 \
  --title "v0.2.0" \
  --notes "See CHANGELOG.md" \
  src-tauri/target/release/bundle/**/*
```

## 🔄 Versioning Guidelines

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.2.0): New features, backward compatible
- **PATCH** (0.1.1): Bug fixes, backward compatible

## 🐛 Troubleshooting

### Build fails on Windows
- Make sure Visual Studio C++ Build Tools are installed
- Run `cargo clean` and try again

### macOS app not signed
- App will show "unidentified developer" warning
- Users need to right-click → Open to bypass
- For distribution, get an Apple Developer certificate

### Linux AppImage doesn't run
- Make sure it's executable: `chmod +x *.AppImage`
- Install FUSE: `sudo apt install libfuse2`

## 📞 Need Help?

- GitHub Actions Documentation: https://docs.github.com/actions
- Tauri Build Guide: https://tauri.app/v1/guides/building/
- GitHub CLI: https://cli.github.com/

