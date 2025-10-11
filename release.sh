#!/bin/bash

# NoBrainDev Release Helper Script
# This script helps prepare a new release

set -e

echo "🧠 NoBrainDev Release Helper"
echo "============================"
echo ""

# Check if version argument is provided
if [ -z "$1" ]; then
    echo "Usage: ./release.sh <version>"
    echo "Example: ./release.sh 0.2.0"
    exit 1
fi

NEW_VERSION=$1

echo "📋 Preparing release v$NEW_VERSION"
echo ""

# Check if git is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: You have uncommitted changes!"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Update version in Cargo.toml
echo "📝 Updating src-tauri/Cargo.toml..."
sed -i.bak "s/^version = \".*\"/version = \"$NEW_VERSION\"/" src-tauri/Cargo.toml && rm src-tauri/Cargo.toml.bak

# Update version in tauri.conf.json
echo "📝 Updating src-tauri/tauri.conf.json..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" src-tauri/tauri.conf.json
else
    # Linux/WSL
    sed -i "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" src-tauri/tauri.conf.json
fi

echo ""
echo "✅ Version updated to $NEW_VERSION"
echo ""

# Create CHANGELOG entry if it doesn't exist
if [ ! -f CHANGELOG.md ]; then
    echo "📝 Creating CHANGELOG.md..."
    cat > CHANGELOG.md << EOF
# Changelog

All notable changes to this project will be documented in this file.

## [$NEW_VERSION] - $(date +%Y-%m-%d)

### Added
- Initial release

### Changed
- 

### Fixed
- 

EOF
    echo "✅ CHANGELOG.md created"
else
    echo "ℹ️  CHANGELOG.md already exists. Please update it manually."
fi

echo ""
echo "📦 Next steps:"
echo ""
echo "1. Review the changes:"
echo "   git diff"
echo ""
echo "2. Update CHANGELOG.md with release notes"
echo ""
echo "3. Commit the changes:"
echo "   git add src-tauri/Cargo.toml src-tauri/tauri.conf.json CHANGELOG.md"
echo "   git commit -m \"chore: bump version to v$NEW_VERSION\""
echo ""
echo "4. Create and push tag:"
echo "   git tag v$NEW_VERSION"
echo "   git push origin main"
echo "   git push origin v$NEW_VERSION"
echo ""
echo "5. Publish GitHub release:"
echo "   visit: https://github.com/techbruwh/nobraindev/releases"
echo ""

