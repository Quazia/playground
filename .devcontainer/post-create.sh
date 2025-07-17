#!/bin/bash

# Post-create script for dev container setup
set -e

echo "🚀 Setting up Farcaster Playground development environment..."

# Make scripts executable
chmod +x /workspace/scripts/*.sh

# Install global dependencies
echo "📦 Installing global Node.js dependencies..."
npm install -g typescript ts-node nodemon

# Install Foundry (for Solidity development)
echo "⚒️  Installing Foundry..."
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc || source ~/.profile || true
if command -v foundryup &> /dev/null; then
    foundryup
else
    echo "⚠️  Foundry installation may need manual setup. Run 'source ~/.bashrc && foundryup' later."
fi

# Set up git hooks (if needed)
echo "🔧 Setting up git configuration..."
git config --global --add safe.directory /workspace

# Create necessary directories
echo "📁 Creating project directories..."
mkdir -p /workspace/logs
mkdir -p /workspace/cache

# Install dependencies
echo "📦 Installing project dependencies..."
cd /workspace
npm install

# Wait for database to be ready and test connection
echo "🗄️  Waiting for database to be ready..."
for i in {1..30}; do
    if pg_isready -h postgres -p 5432 -U shovel -d shovel_test; then
        echo "✅ Database is ready!"
        break
    fi
    echo "⏳ Waiting for database... ($i/30)"
    sleep 2
done

# Test database connection
echo "🧪 Testing database connection..."
if npm list pg &> /dev/null; then
    echo "📊 Database package found, testing connection..."
    # Test will run when user executes the test script
else
    echo "⚠️  PostgreSQL package not found. Install with: npm install pg @types/pg"
fi

echo "✅ Dev container setup complete!"
echo ""
echo "🎯 Quick start commands:"
echo "  ./scripts/db-manage.sh status   - Check database status"
echo "  npm run test:shovel             - Test Shovel setup"
echo "  npx hardhat node                - Start local blockchain"
echo ""
echo "🌐 Available services:"
echo "  📊 Adminer (DB UI): http://localhost:8080"
echo "  🗄️  PostgreSQL: localhost:5432"
echo "  ⛓️  Hardhat Node: localhost:8545 (when started)"
echo ""
