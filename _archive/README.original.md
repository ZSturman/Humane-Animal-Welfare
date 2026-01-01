# 🐾 Shelter Link

**A Unified Humane Animal Shelter Platform**

Shelter Link connects animal shelters, rescues, and adopters to save animal lives. The platform surfaces at-risk animals, enables cross-shelter collaboration, and provides data-driven insights to prioritize animals most in need.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4.24-black.svg)](https://www.fastify.io/)

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Demo Mode](#-demo-mode)
- [Developer Guide](#-developer-guide)
- [Shelter Administrator Guide](#-shelter-administrator-guide)
- [API Reference](#-api-reference)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [Governance & Ethics](#-governance--ethics)
- [License](#-license)

---

## 🌟 Overview

### Mission

To create an equitable, transparent, and humane technology platform that helps identify, surface, and prioritize animals most in need of adoption or rescue—with special focus on seniors, special-needs animals, and those at elevated risk of euthanasia.

### Problem Statement

Every year, millions of animals enter shelters in the United States alone. Many face euthanasia due to overcrowding, lack of visibility, or inadequate cross-shelter communication. Shelter Link addresses this by:

1. **Surfacing At-Risk Animals** - Algorithmic identification of animals needing urgent attention
2. **Enabling Transfers** - Cross-shelter collaboration to move animals to safety
3. **Standardizing Data** - Universal animal identification across organizations
4. **Providing Insights** - Data-driven decision support for shelter staff

### Who Is This For?

| Stakeholder | Use Case |
|-------------|----------|
| **Shelter Staff** | Daily animal management, risk monitoring, intake/outcome tracking |
| **Rescue Organizations** | Finding animals to pull, coordinating transfers |
| **Shelter Directors** | Capacity planning, outcome analytics, policy decisions |
| **Foster Coordinators** | Managing foster placements, tracking animals in care |
| **Developers** | Building integrations, extending functionality |

---

## ✨ Key Features

### 🚨 Risk Scoring Engine
- Composite urgency scoring (0-100) based on configurable weights
- Factors: Length of Stay, Medical, Behavioral, Capacity, Age, Special Needs
- Severity levels: CRITICAL, HIGH, ELEVATED, MODERATE, LOW
- Explainable AI with top contributing factors

### 🔄 Cross-Shelter Transfers
- Request/approve/decline workflow
- Animal history preservation across organizations
- Transport coordination support

### 📊 Data Standardization
- SAC (Shelter Animals Count) taxonomy compliance
- ISO 11784/11785 microchip support
- Universal animal identification

### 📱 Progressive Web App
- Mobile-friendly, works offline
- 9 language support (EN, ES, FR, DE, PT, ZH, VI, KO, JA)
- Push notifications for alerts

### 🔐 Role-Based Access Control
- 11 role types (Super Admin, Org Admin, Staff, Volunteer, etc.)
- Organization-level permissions
- API key authentication for integrations

### 📥 Data Import
- CSV/Excel upload with field mapping
- API connections (ASM3, Shelterluv, PetPoint)
- Scheduled sync support

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Shelter Link                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Web PWA   │  │  Mobile PWA │  │   External Integrations │  │
│  │  React 18   │  │  (Same App) │  │   (ASM3, Shelterluv)    │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                     │                 │
│         └────────────────┼─────────────────────┘                 │
│                          │                                       │
│                   ┌──────▼──────┐                                │
│                   │   API GW    │                                │
│                   │   Fastify   │                                │
│                   │  + Swagger  │                                │
│                   └──────┬──────┘                                │
│                          │                                       │
│         ┌────────────────┼────────────────┐                      │
│         │                │                │                      │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐              │
│  │    Auth     │  │   Animals   │  │   Transfers │              │
│  │   Service   │  │   Service   │  │   Service   │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          │                                       │
│         ┌────────────────┼────────────────┐                      │
│         │                │                │                      │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐              │
│  │ PostgreSQL  │  │    Redis    │  │    MinIO    │              │
│  │  (Prisma)   │  │  (BullMQ)   │  │  (Storage)  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite 5, TailwindCSS, TanStack Query, Zustand |
| **Backend** | Fastify 4, Node.js 20+, TypeScript 5.3 |
| **Database** | PostgreSQL 16, Prisma ORM 5.7 |
| **Cache/Queue** | Redis 7, BullMQ |
| **Storage** | S3-compatible (MinIO for dev) |
| **Monorepo** | Turborepo, npm workspaces |

### Project Structure

```
shelter-link/
├── apps/
│   ├── api/                 # Fastify REST API
│   │   ├── src/
│   │   │   ├── routes/      # API endpoints
│   │   │   ├── services/    # Business logic
│   │   │   ├── middleware/  # Auth, audit, etc.
│   │   │   └── lib/         # Utilities
│   │   └── Dockerfile
│   └── web/                 # React PWA
│       ├── src/
│       │   ├── pages/       # Route components
│       │   ├── components/  # Reusable UI
│       │   ├── stores/      # Zustand state
│       │   ├── mocks/       # Demo mode data
│       │   └── lib/         # API client, utils
│       └── Dockerfile
├── packages/
│   ├── database/            # Prisma schema & client
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── seed.ts
│   └── types/               # Shared TypeScript types
├── e2e/                     # Playwright E2E tests
├── docs/                    # Documentation
│   ├── GOVERNANCE.md
│   ├── ETHICAL_AI_GUIDELINES.md
│   └── TESTING.md
├── docker-compose.yml
├── turbo.json
└── package.json
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **npm** 10+ (comes with Node.js)
- **Docker** & Docker Compose ([Download](https://www.docker.com/products/docker-desktop/))

### Option 1: Demo Mode (No Database Required)

The fastest way to explore Shelter Link without any backend setup:

```bash
# Clone the repository
git clone https://github.com/ZSturman/Humane-Animal-Welfare.git
cd Humane-Animal-Welfare

# Install dependencies
npm install

# Start in demo mode (uses mock data)
npm run dev:demo
```

Open http://localhost:3000 - you'll be automatically logged in with sample data.

### Option 2: Full Stack Development

For full development with database and API:

```bash
# Clone the repository
git clone https://github.com/ZSturman/Humane-Animal-Welfare.git
cd Humane-Animal-Welfare

# Install dependencies
npm install

# Start infrastructure (PostgreSQL, Redis, MinIO)
docker-compose up -d postgres redis minio

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed with sample data
npm run db:seed

# Start development servers
npm run dev
```

- **Web App**: http://localhost:3000
- **API**: http://localhost:4000
- **API Docs**: http://localhost:4000/documentation
- **Prisma Studio**: `npm run db:studio` → http://localhost:5555

### Default Credentials (Development)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@shelterlink.dev | password123 |
| Org Admin | shelter@example.org | password123 |
| Staff | staff@example.org | password123 |

---

## 🎮 Demo Mode

Demo mode lets you explore the full UI with realistic mock data without running any backend services. Perfect for:

- **Designers** - Reviewing UI/UX
- **Product Managers** - Understanding features
- **Stakeholders** - Demos and presentations
- **Developers** - Frontend development without API

### Enabling Demo Mode

**Option 1: NPM Script**
```bash
npm run dev:demo
```

**Option 2: Environment Variable**
```bash
VITE_MOCK_MODE=true npm run dev --filter=@shelter-link/web
```

**Option 3: Create `.env.local`**
```bash
# apps/web/.env.local
VITE_MOCK_MODE=true
```

### Demo Mode Features

- ✅ Auto-login as demo user
- ✅ 40+ sample animals (dogs, cats, rabbits, birds)
- ✅ Risk scoring with various severity levels
- ✅ Transfer requests (incoming/outgoing)
- ✅ Full navigation and filtering
- ❌ Read-only (no data persistence)
- ❌ No file uploads

### Demo Data Overview

| Entity | Count | Notes |
|--------|-------|-------|
| Animals | 45 | Mixed species, ages, risk levels |
| At-Risk Animals | 12 | CRITICAL to ELEVATED severity |
| Transfers (Incoming) | 3 | Various statuses |
| Transfers (Outgoing) | 2 | Pending and completed |
| Organization | 1 | "Happy Paws Shelter" |
| User | 1 | Admin role with full access |

---

## 👩‍💻 Developer Guide

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start all apps in development mode |
| `npm run dev:demo` | Start web app in demo mode |
| `npm run build` | Build all apps for production |
| `npm run test` | Run all unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run lint` | Lint all packages |
| `npm run format` | Format with Prettier |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Create migration from schema changes |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run clean` | Remove build artifacts |

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL="postgresql://shelter:shelter@localhost:5432/shelter_link"

# Auth
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# API
API_PORT=4000
API_HOST=0.0.0.0
CORS_ORIGINS="http://localhost:3000,http://localhost:5173"

# Web
VITE_API_URL="http://localhost:4000"
VITE_MOCK_MODE="false"

# Storage (MinIO for dev, S3 for prod)
STORAGE_PROVIDER="minio"
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"

# Redis
REDIS_URL="redis://localhost:6379"
```

### Code Style

- **TypeScript** strict mode enabled
- **ESLint** with recommended configs
- **Prettier** for formatting
- **Conventional Commits** for commit messages

```bash
# Before committing
npm run lint
npm run format
npm run test
```

### Adding a New Feature

1. **Database changes**: Modify `packages/database/prisma/schema.prisma`
2. **Generate client**: `npm run db:generate`
3. **API route**: Add to `apps/api/src/routes/`
4. **Types**: Add to `packages/types/src/`
5. **Frontend**: Add page/component to `apps/web/src/`
6. **Tests**: Add tests to `__tests__/` folders
7. **Mock data**: Update `apps/web/src/mocks/` for demo mode

---

## 🏠 Shelter Administrator Guide

### Getting Started

1. **Request Access**: Contact your organization's admin or Shelter Link support
2. **Login**: Navigate to your Shelter Link instance and log in
3. **Dashboard**: View at-risk animals, recent activity, and key metrics

### Daily Operations

#### Viewing At-Risk Animals

1. Click **"At-Risk Animals"** in the sidebar
2. Animals are sorted by urgency score (highest first)
3. Click severity badges to filter (CRITICAL, HIGH, etc.)
4. Click an animal to view details and take action

#### Understanding Risk Scores

| Severity | Score Range | Recommended Action |
|----------|-------------|-------------------|
| 🔴 CRITICAL | 80-100 | Immediate intervention required |
| 🟠 HIGH | 60-79 | Prioritize for adoption/rescue |
| 🟡 ELEVATED | 40-59 | Monitor closely, consider promotion |
| 🟢 MODERATE | 20-39 | Standard care, regular updates |
| ⚪ LOW | 0-19 | Healthy, good adoption prospects |

#### Risk Factors Explained

- **Length of Stay**: Days in shelter vs. target for species/age
- **Medical**: Current health conditions and treatability
- **Behavioral**: Assessment results, kennel stress observations
- **Capacity**: Shelter population pressure
- **Age**: Senior animals face adoption challenges
- **Special Needs**: Additional care requirements

### Managing Animals

#### Adding a New Animal

1. Click **"Animals"** → **"Add Animal"**
2. Fill in required fields (Name, Species, Status)
3. Add photos (first photo becomes primary)
4. Save and the system calculates initial risk score

#### Recording Medical Information

1. Open animal profile → **"Medical"** tab
2. Click **"Add Record"**
3. Select type (Exam, Treatment, Surgery, etc.)
4. Document findings and prognosis
5. Set follow-up dates if needed

#### Initiating a Transfer

1. Open animal profile → **"Transfer"** tab
2. Click **"Request Transfer"**
3. Select destination organization
4. Add notes about animal's needs
5. Submit request

### Importing Data

#### From Spreadsheet

1. Click **"Import"** → **"Upload File"**
2. Select CSV or Excel file
3. Map columns to Shelter Link fields
4. Preview and validate data
5. Confirm import

#### From Other Software

1. Click **"Import"** → **"Connect System"**
2. Select your software (ASM3, Shelterluv, PetPoint)
3. Enter API credentials
4. Configure sync schedule
5. Run initial import

### Best Practices

- **Update daily**: Keep animal statuses and notes current
- **Review at-risk**: Check critical animals every shift
- **Use notes**: Document behavioral observations
- **Respond quickly**: Don't leave transfer requests pending
- **Override when needed**: Add context if risk score seems incorrect

---

## 📡 API Reference

Full API documentation available at `/documentation` when running the API server.

### Base URL

- **Development**: `http://localhost:4000`
- **Production**: `https://api.shelterlink.org`

### Authentication

All endpoints (except `/health` and `/auth/login`) require authentication:

```bash
# Login to get tokens
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@shelterlink.dev", "password": "password123"}'

# Use token in requests
curl http://localhost:4000/animals \
  -H "Authorization: Bearer <your-access-token>"
```

### Key Endpoints

#### Animals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/animals` | List animals with pagination/filters |
| GET | `/animals/:id` | Get animal details |
| POST | `/animals` | Create animal |
| PUT | `/animals/:id` | Update animal |
| DELETE | `/animals/:id` | Delete animal |
| GET | `/animals/at-risk` | List at-risk animals |

#### Risk

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/risk/:animalId` | Get risk profile |
| PATCH | `/risk/:animalId` | Update risk factors |
| POST | `/risk/:animalId/override` | Manual score override |
| GET | `/risk/dashboard` | Dashboard statistics |
| POST | `/risk/recalculate` | Recalculate all scores |

#### Transfers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/transfers` | List transfer requests |
| POST | `/transfers` | Create transfer request |
| PUT | `/transfers/:id` | Approve/decline transfer |
| POST | `/transfers/:id/complete` | Complete transfer |
| POST | `/transfers/:id/cancel` | Cancel transfer |

#### Organizations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/organizations` | List organizations |
| GET | `/organizations/:slug` | Get organization by slug |
| GET | `/organizations/me` | Current user's org |
| GET | `/organizations/:slug/stats` | Organization statistics |

### Error Responses

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid request data |
| 401 | UNAUTHORIZED | Missing or invalid auth |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

---

## 🧪 Testing

See [docs/TESTING.md](docs/TESTING.md) for comprehensive testing documentation.

### Quick Commands

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

### Coverage Requirements

| Metric | Threshold |
|--------|-----------|
| Statements | 70% |
| Branches | 60% |
| Functions | 70% |
| Lines | 70% |

---

## 🚢 Deployment

### Docker Deployment

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables (Production)

```bash
# Required
DATABASE_URL="postgresql://..."
JWT_SECRET="<generate-secure-secret>"
REDIS_URL="redis://..."

# Recommended
NODE_ENV="production"
API_HOST="0.0.0.0"
CORS_ORIGINS="https://yourdomain.com"
```

### Cloud Platforms

#### Fly.io
```bash
fly launch
fly secrets set DATABASE_URL="..." JWT_SECRET="..."
fly deploy
```

#### Railway
1. Connect GitHub repository
2. Add PostgreSQL and Redis plugins
3. Set environment variables
4. Deploy

#### Vercel + PlanetScale
1. Deploy `apps/web` to Vercel
2. Deploy `apps/api` to Railway/Fly.io
3. Use PlanetScale for serverless PostgreSQL

---

## 🤝 Contributing

We welcome contributions! Please read our contributing guidelines:

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm run test`
5. Commit with conventional commits: `git commit -m "feat: add new feature"`
6. Push and create a Pull Request

### Commit Convention

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style (no logic change) |
| `refactor` | Code refactoring |
| `test` | Adding/updating tests |
| `chore` | Maintenance tasks |

### Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure CI passes
4. Request review from maintainers
5. Squash and merge when approved

---

## ⚖️ Governance & Ethics

Shelter Link is committed to ethical AI and transparent governance.

### Key Documents

- [Governance Framework](docs/GOVERNANCE.md) - Decision-making, council structure, data policies
- [Ethical AI Guidelines](docs/ETHICAL_AI_GUIDELINES.md) - AI principles, prohibited uses, bias prevention

### Core Principles

1. **Animal Welfare First** - Every decision prioritizes animal outcomes
2. **Human Oversight** - Staff retain ultimate decision authority
3. **Transparency** - Explainable AI, open algorithms
4. **Equity** - Fair treatment across breeds, species, organizations
5. **Privacy** - Data minimization, consent, security

### Reporting Concerns

- **Technical Issues**: GitHub Issues
- **Ethics Concerns**: ethics@shelterlink.org
- **Security Vulnerabilities**: security@shelterlink.org

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Shelter Animals Count (SAC) for taxonomy standards
- ASPCA for shelter best practices research
- All the shelters and rescues working to save animal lives

---

<p align="center">
  <strong>Built with ❤️ for animals everywhere</strong>
</p>
