#!/bin/bash
# ============================================================================
# ShelterLink - Local Development Setup
# ============================================================================
# This script sets up the local development environment with:
# - SQLite database
# - Demo users and animals
# - Ready to run prototype
#
# Usage: ./scripts/setup-local.sh
# ============================================================================

set -e

echo ""
echo "=============================================="
echo "🐾 ShelterLink Local Development Setup"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo -e "${BLUE}Checking prerequisites...${NC}"
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    echo "   Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "  ✓ Node.js $(node -v)"
echo ""

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm install
echo ""

# Create uploads directory
echo -e "${BLUE}Creating uploads directory...${NC}"
mkdir -p uploads
echo "  ✓ uploads/"
echo ""

# Generate Prisma client
echo -e "${BLUE}Generating Prisma client...${NC}"
cd packages/database
npx prisma generate
cd ../..
echo ""

# Create/reset database
echo -e "${BLUE}Setting up SQLite database...${NC}"
rm -f packages/database/dev.db
cd packages/database
npx prisma db push
cd ../..
echo ""

# Seed database
echo -e "${BLUE}Seeding database with demo data...${NC}"
cd packages/database
npx tsx prisma/seed.ts
cd ../..
echo ""

# Success message
echo ""
echo -e "${GREEN}=============================================="
echo "✅ Setup Complete!"
echo "==============================================${NC}"
echo ""
echo "To start the development servers:"
echo ""
echo -e "  ${YELLOW}npm run dev${NC}"
echo ""
echo "Or start them individually:"
echo ""
echo "  API:  cd apps/api && npm run dev"
echo "  Web:  cd apps/web && npm run dev"
echo ""
echo "Demo Credentials:"
echo "  ┌─────────────────────────────────────────────┐"
echo "  │ Superadmin: superadmin@shelterlink.org      │"
echo "  │             admin123                        │"
echo "  │                                             │"
echo "  │ Admin:      admin@happypaws.org             │"
echo "  │             password123                     │"
echo "  │                                             │"
echo "  │ Volunteer:  volunteer@happypaws.org         │"
echo "  │             password123                     │"
echo "  └─────────────────────────────────────────────┘"
echo ""
echo "API will be available at: http://localhost:4000"
echo "Web will be available at: http://localhost:5173"
echo ""
