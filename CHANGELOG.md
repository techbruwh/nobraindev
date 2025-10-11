# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 

### Changed
- 

### Fixed
- 

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