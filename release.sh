#!/bin/bash

# NoBrainDev Release Helper Script
# This script helps prepare a new release

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧠 NoBrainDev Release Helper${NC}"
echo "============================"
echo ""

# Check if version argument is provided
if [ -z "$1" ]; then
    echo -e "${RED}Usage: ./release.sh <version> [commit-message]${NC}"
    echo "Example: ./release.sh 0.2.0"
    echo "Example: ./release.sh 0.2.0 \"fix: update app name\""
    exit 1
fi

NEW_VERSION=$1
COMMIT_MSG="${2:-chore: bump version to v$NEW_VERSION}"

echo -e "${BLUE}📋 Preparing release v$NEW_VERSION${NC}"
echo ""

# Check if git is clean
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes!${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Update version in Cargo.toml
echo -e "${BLUE}📝 Updating src-tauri/Cargo.toml...${NC}"
sed -i.bak "s/^version = \".*\"/version = \"$NEW_VERSION\"/" src-tauri/Cargo.toml && rm src-tauri/Cargo.toml.bak

# Update version in tauri.conf.json
echo -e "${BLUE}📝 Updating src-tauri/tauri.conf.json...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" src-tauri/tauri.conf.json
else
    # Linux/WSL
    sed -i "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" src-tauri/tauri.conf.json
fi

echo ""
echo -e "${GREEN}✅ Version updated to $NEW_VERSION${NC}"
echo ""

# Create CHANGELOG entry if it doesn't exist
if [ ! -f CHANGELOG.md ]; then
    echo -e "${BLUE}📝 Creating CHANGELOG.md...${NC}"
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
    echo -e "${GREEN}✅ CHANGELOG.md created${NC}"
else
    echo -e "${YELLOW}ℹ️  CHANGELOG.md already exists. Please update it manually.${NC}"
fi

echo ""
echo -e "${BLUE}📦 Committing and pushing changes...${NC}"
echo ""

# Add all changes
echo -e "${BLUE}📦 Adding files...${NC}"
git add src-tauri/Cargo.toml src-tauri/tauri.conf.json CHANGELOG.md

# Show what will be committed
echo -e "${BLUE}📋 Changes to commit:${NC}"
git status -s

# Commit changes
echo ""
echo -e "${BLUE}💾 Committing changes...${NC}"
git commit -m "$COMMIT_MSG"
echo -e "${GREEN}✅ Committed: $COMMIT_MSG${NC}"

# Create tag
echo ""
echo -e "${BLUE}🏷️  Creating tag v$NEW_VERSION...${NC}"
git tag "v$NEW_VERSION"
echo -e "${GREEN}✅ Tag created: v$NEW_VERSION${NC}"

# Push to main
echo ""
echo -e "${BLUE}⬆️  Pushing to origin main...${NC}"
git push origin main
echo -e "${GREEN}✅ Pushed to main${NC}"

# Push tag
echo ""
echo -e "${BLUE}⬆️  Pushing tag v$NEW_VERSION...${NC}"
git push origin "v$NEW_VERSION"
echo -e "${GREEN}✅ Pushed tag: v$NEW_VERSION${NC}"

echo ""
echo -e "${GREEN}🎉 Release v$NEW_VERSION is ready!${NC}"
echo ""
echo -e "${BLUE}📝 Next step: Create GitHub release at:${NC}"
echo "   https://github.com/techbruwh/nobraindev/releases/new?tag=v$NEW_VERSION"
echo ""