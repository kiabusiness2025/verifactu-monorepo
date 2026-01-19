#!/bin/bash
# Project Setup Script

set -e

echo "🚀 Verifactu Development Environment Setup"
echo "=========================================="
echo ""

# Check for required tools
echo "📦 Checking for required tools..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20 or later."
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm is not installed. Installing..."
    npm install -g pnpm@10.27.0
fi

if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git."
    exit 1
fi

echo "✅ All required tools found"
echo ""

# Install dependencies
echo "📥 Installing dependencies..."
pnpm install --frozen-lockfile

echo "✅ Dependencies installed"
echo ""

# Setup environment
echo "🔧 Setting up environment..."

if [ ! -f "apps/app/.env.local" ]; then
    echo "Creating .env.local..."
    cp apps/app/.env.example apps/app/.env.local 2>/dev/null || echo "No .env.example found"
fi

echo "✅ Environment setup complete"
echo ""

# Build the project
echo "🏗️  Building project..."
pnpm run build

echo "✅ Build complete"
echo ""

# Setup git hooks
echo "🪝 Setting up Git hooks..."
if [ -f ".git/hooks/pre-commit" ]; then
    echo "Pre-commit hook already exists"
else
    mkdir -p .git/hooks
    chmod +x .husky/pre-commit
fi

echo "✅ Git hooks setup complete"
echo ""

# Start docker containers
if command -v docker &> /dev/null; then
    echo "🐳 Starting Docker containers..."
    docker-compose up -d
    echo "✅ Docker containers started"
else
    echo "⚠️  Docker not found. Skipping container startup."
    echo "   Run 'docker-compose up -d' manually if needed"
fi

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Start development: pnpm dev"
echo "2. Open browser: http://localhost:3000"
echo "3. View helpful commands: make help"
echo ""
