# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-01-11

### 🐛 Bug Fixes
-  remove clerk, onboard supabase auth



## [1.0.17] - 2026-01-09

### 🐛 Bug Fixes
-  fix sync status



## [1.0.16] - 2026-01-09

### 🐛 Bug Fixes
-  using email and code to register and login



## [1.0.15] - 2026-01-09

### 🐛 Bug Fixes
-  using localhost plugin for tauri app



## [1.0.14] - 2026-01-09

### 🐛 Bug Fixes
-  Configure CSP for Production



## [1.0.13] - 2026-01-09

### 🐛 Bug Fixes
-  using dotenv to load values from env var in local and ci/cd



## [1.0.12] - 2026-01-09

### 🐛 Bug Fixes
-  enable release draft



## [1.0.11] - 2026-01-09

### 🐛 Bug Fixes
-  pass env vars directly to vite build



## [1.0.10] - 2026-01-09

### 🐛 Bug Fixes
-  pass env vars directly to vite build



## [1.0.9] - 2026-01-09

### ✨ Features
-  version in sidebar auto update using release.sh



## [1.0.8] - 2026-01-09

### 🐛 Bug Fixes
-  release pipeline to create both .env and env.production



## [1.0.7] - 2026-01-09

### ✨ Features
-  add e2e encryption badge



## [1.0.6] - 2026-01-09

### 🐛 Bug Fixes
-  release pipeline to specify production mode



## [1.0.5] - 2026-01-09



## [1.0.4] - 2026-01-09



## [1.0.3] - 2026-01-09

### ✨ Features
-  make snippets autofocus when selected by search
-  add sync to footer and memory optimizing



## [1.0.2] - 2026-01-09

### 🐛 Bug Fixes
-  broken gha release yaml for windows due to linux command usage



## [1.0.1] - 2026-01-09

### 🐛 Bug Fixes
-  broken gha release yaml



## [1.0.0] - 2026-01-09

### ✨ Features
-  add account sync


## [0.2.8] - 2026-01-08

### ✨ Features
-  release.sh is now accepting 2 params such as ./release.sh version commit

### 🔧 Chores
-  bump readme badge version



The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-07

### Added
- 

### Changed
- UI Update

### Fixed
-

## [0.1.4] - 2026-01-06

### Added
- 

### Changed
- UI Update

### Fixed
- Broken scroll area

## [0.1.2] - 2025-01-20

### Added
- Code signing and notarization for macOS distribution
- Automated GitHub Actions release workflow

### Fixed
- "Damaged app" warning on fresh macOS installations

## [0.1.1] - 2025-01-10

### Added
- Comprehensive icon set for all platforms (iOS, Android, macOS, Web)
- App icon in README.md

### Changed
- Updated icon configuration in tauri.conf.json to use organized icon structure
- Updated setup.sh to use libwebkit2gtk-4.1-dev (Ubuntu 22.04+ compatibility)
- Updated GitHub Actions workflow to use libwebkit2gtk-4.1-dev

### Fixed
- Fixed missing icon files error during build (removed references to non-existent .icns and .ico)
- Fixed dependency installation error in setup.sh for newer Ubuntu/Debian versions
- Fixed GitHub Actions build error due to outdated webkit package name

## [0.1.0] - 2025-01-10

### Added
- Initial release of NoBrainDev
- Code snippet management (create, read, update, delete)
- Keyword-based search functionality
- AI semantic search with natural language queries
- SQLite database for local storage
- Modern UI with React, Tailwind CSS, and shadcn/ui
- Support for multiple programming languages
- Tags and descriptions for snippets
- Copy to clipboard functionality
- Cross-platform support (Windows, macOS, Linux)

### Features
- 📝 Organize code snippets by language and tags
- 🔍 Smart keyword search
- 🤖 AI-powered semantic search using all-MiniLM-L6-v2 model
- 💾 Local-first architecture with SQLite
- 🎨 Beautiful modern interface
- ⚡ Fast and lightweight desktop app built with Tauri

[unreleased]: https://github.com/techbruwh/nobraindev/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/techbruwh/nobraindev/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/techbruwh/nobraindev/releases/tag/v0.1.0