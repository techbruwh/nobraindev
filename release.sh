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

# Get the last tag to determine commit range
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [ -z "$LAST_TAG" ]; then
    echo -e "${YELLOW}ℹ️  No previous tags found. Using all commits.${NC}"
    COMMIT_RANGE=""
else
    echo -e "${BLUE}📊 Generating changelog since $LAST_TAG${NC}"
    COMMIT_RANGE="$LAST_TAG..HEAD"
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

# Update version badge in README.md
echo -e "${BLUE}📝 Updating README.md...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/badge\/version-[0-9.]*-blue/badge\/version-$NEW_VERSION-blue/" README.md
else
    # Linux/WSL
    sed -i "s/badge\/version-[0-9.]*-blue/badge\/version-$NEW_VERSION-blue/" README.md
fi

# Update version in MenuSidebar component
echo -e "${BLUE}📝 Updating ui/src/components/ui/menusidebar.jsx...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/v[0-9.]*<\/div>/v$NEW_VERSION<\/div>/" ui/src/components/ui/menusidebar.jsx
else
    # Linux/WSL
    sed -i "s/v[0-9.]*<\/div>/v$NEW_VERSION<\/div>/" ui/src/components/ui/menusidebar.jsx
fi

echo ""
echo -e "${GREEN}✅ Version updated to $NEW_VERSION${NC}"
echo ""

# Generate changelog entries from git commits
echo -e "${BLUE}📝 Generating CHANGELOG.md entries...${NC}"

# Extract commits by type
if [ -n "$COMMIT_RANGE" ]; then
    FEAT_COMMITS=$(git log $COMMIT_RANGE --pretty=format:"%s" --grep="^feat" --grep="^feat(" || echo "")
    FIX_COMMITS=$(git log $COMMIT_RANGE --pretty=format:"%s" --grep="^fix" --grep="^fix(" || echo "")
    REFACTOR_COMMITS=$(git log $COMMIT_RANGE --pretty=format:"%s" --grep="^refactor" --grep="^refactor(" || echo "")
    CHORE_COMMITS=$(git log $COMMIT_RANGE --pretty=format:"%s" --grep="^chore" --grep="^chore(" || echo "")
else
    FEAT_COMMITS=$(git log --pretty=format:"%s" --grep="^feat" --grep="^feat(" || echo "")
    FIX_COMMITS=$(git log --pretty=format:"%s" --grep="^fix" --grep="^fix(" || echo "")
    REFACTOR_COMMITS=$(git log --pretty=format:"%s" --grep="^refactor" --grep="^refactor(" || echo "")
    CHORE_COMMITS=$(git log --pretty=format:"%s" --grep="^chore" --grep="^chore(" || echo "")
fi

# Prepare changelog content
CHANGELOG_CONTENT="## [$NEW_VERSION] - $(date +%Y-%m-%d)\n\n"

# Add features
if [ -n "$FEAT_COMMITS" ]; then
    CHANGELOG_CONTENT+="### ✨ Features\n"
    while IFS= read -r commit; do
        # Remove "feat: " or "feat(scope): " prefix
        msg=$(echo "$commit" | sed -E 's/^feat(\([^)]*\))?:\s*//')
        CHANGELOG_CONTENT+="- $msg\n"
    done <<< "$FEAT_COMMITS"
    CHANGELOG_CONTENT+="\n"
fi

# Add fixes
if [ -n "$FIX_COMMITS" ]; then
    CHANGELOG_CONTENT+="### 🐛 Bug Fixes\n"
    while IFS= read -r commit; do
        msg=$(echo "$commit" | sed -E 's/^fix(\([^)]*\))?:\s*//')
        CHANGELOG_CONTENT+="- $msg\n"
    done <<< "$FIX_COMMITS"
    CHANGELOG_CONTENT+="\n"
fi

# Add refactors
if [ -n "$REFACTOR_COMMITS" ]; then
    CHANGELOG_CONTENT+="### ♻️ Refactoring\n"
    while IFS= read -r commit; do
        msg=$(echo "$commit" | sed -E 's/^refactor(\([^)]*\))?:\s*//')
        CHANGELOG_CONTENT+="- $msg\n"
    done <<< "$REFACTOR_COMMITS"
    CHANGELOG_CONTENT+="\n"
fi

# Add chores
if [ -n "$CHORE_COMMITS" ]; then
    CHANGELOG_CONTENT+="### 🔧 Chores\n"
    while IFS= read -r commit; do
        msg=$(echo "$commit" | sed -E 's/^chore(\([^)]*\))?:\s*//')
        CHANGELOG_CONTENT+="- $msg\n"
    done <<< "$CHORE_COMMITS"
    CHANGELOG_CONTENT+="\n"
fi

# Update or create CHANGELOG.md
if [ -f CHANGELOG.md ]; then
    echo -e "${BLUE}📝 Updating CHANGELOG.md...${NC}"
    # Create temp file with new content
    echo -e "# Changelog\n" > CHANGELOG.tmp
    echo -e "All notable changes to this project will be documented in this file.\n" >> CHANGELOG.tmp
    echo -e "$CHANGELOG_CONTENT" >> CHANGELOG.tmp
    # Append old content (skip first 3 lines which are header)
    tail -n +4 CHANGELOG.md >> CHANGELOG.tmp 2>/dev/null || true
    mv CHANGELOG.tmp CHANGELOG.md
    echo -e "${GREEN}✅ CHANGELOG.md updated${NC}"
else
    echo -e "${BLUE}📝 Creating CHANGELOG.md...${NC}"
    cat > CHANGELOG.md << EOF
# Changelog

All notable changes to this project will be documented in this file.

$(echo -e "$CHANGELOG_CONTENT")
EOF
    echo -e "${GREEN}✅ CHANGELOG.md created${NC}"
fi

echo ""
echo -e "${BLUE}📦 Committing and pushing changes...${NC}"
echo ""

# Add all changes
echo -e "${BLUE}📦 Adding files...${NC}"
git add src-tauri/Cargo.toml src-tauri/tauri.conf.json README.md CHANGELOG.md ui/src/components/ui/menusidebar.jsx

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

# Create GitHub release draft with changelog
echo ""
echo -e "${BLUE}📝 Creating GitHub release draft...${NC}"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub CLI (gh) not found. Skipping release draft creation.${NC}"
    echo -e "${BLUE}📝 Manual step: Create GitHub release at:${NC}"
    echo "   https://github.com/techbruwh/nobraindev/releases/new?tag=v$NEW_VERSION"
else
    # Prepare release notes from changelog content
    RELEASE_NOTES=$(echo -e "$CHANGELOG_CONTENT" | sed 's/^## \[.*\] - .*$//')
    
    # Create draft release
    if gh release create "v$NEW_VERSION" \
        --draft \
        --title "v$NEW_VERSION" \
        --notes "$RELEASE_NOTES" 2>&1; then
        echo -e "${GREEN}✅ GitHub release draft created${NC}"
        echo -e "${BLUE}📝 View and publish at:${NC}"
        echo "   https://github.com/techbruwh/nobraindev/releases"
    else
        echo -e "${YELLOW}⚠️  Failed to create release draft. You may need to authenticate with 'gh auth login'${NC}"
        echo -e "${BLUE}📝 Manual step: Create GitHub release at:${NC}"
        echo "   https://github.com/techbruwh/nobraindev/releases/new?tag=v$NEW_VERSION"
    fi
fi

echo ""
echo -e "${GREEN}🎉 Release v$NEW_VERSION is ready!${NC}"
echo ""