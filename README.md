# 🐾 ShelterLink

**A Unified Humane Animal Shelter Platform**

> Connecting shelters, rescues, and adopters to save animal lives.

---

## ⚡ Quick Start

### Prerequisites

- Node.js 18+ (or 20+ recommended)
- npm 10+

### Setup

```bash
# Clone and enter the directory
cd Humane_Animal_Shalters

# Run the setup script
npm run setup
```

This will:
- Install all dependencies
- Create the SQLite database
- Seed demo data (users, organizations, animals)

### Start Development

```bash
npm run dev
```

This starts:
- **API**: http://localhost:4000
- **Web**: http://localhost:5173

---

## 🔑 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Superadmin | superadmin@shelterlink.org | admin123 |
| Shelter Admin | admin@happypaws.org | password123 |
| Volunteer | volunteer@happypaws.org | password123 |
| Rescue Admin | admin@secondchance.org | password123 |

---

## 📋 User Flows

This prototype implements 11 core user flows:

### 1. Anonymous Animal Discovery
Browse animals without an account. Search by location, filter by species, sort by risk level.

```
GET http://localhost:4000/animals
GET http://localhost:4000/animals?species=DOG&city=Springfield
GET http://localhost:4000/animals/at-risk
```

### 2. Public Animal Viewing
View animal details, photos, and risk profiles. No login required.

```
GET http://localhost:4000/animals/:id
```

### 3. Login/Logout
Authenticate to access additional features.

```
POST http://localhost:4000/auth/login
  { "email": "admin@happypaws.org", "password": "password123" }

POST http://localhost:4000/auth/logout
GET http://localhost:4000/auth/me
```

### 4. Superadmin: Create Organization
Add new shelters/rescues to the platform.

```
POST http://localhost:4000/organizations
  Authorization: Bearer <superadmin-token>
```

### 5. Shelter Join Request
Shelters can request to join ShelterLink (public CTA).

```
POST http://localhost:4000/organizations/join-request
  { "organizationName": "...", "contactEmail": "..." }
```

### 6. Search by Organization
Find animals at specific shelters.

```
GET http://localhost:4000/organizations
GET http://localhost:4000/organizations/happy-paws
GET http://localhost:4000/organizations?city=Chicago
```

### 7. Shelter Staff: Animal CRUD
Add, edit, and manage animals (requires authentication).

```
POST http://localhost:4000/animals
PATCH http://localhost:4000/animals/:id
DELETE http://localhost:4000/animals/:id
```

### 8. Humane Outcome Recording
Record adoptions (celebration) or euthanasia (respectful messaging).

```
POST http://localhost:4000/animals/:id/outcome
  { "type": "ADOPTION", "notes": "Found a loving family!" }

POST http://localhost:4000/animals/:id/outcome
  { "type": "EUTHANASIA", "reason": "MEDICAL", "notes": "..." }
```

### 9. Photo Management
Upload multiple photos, set thumbnails.

```
POST http://localhost:4000/animals/:id/photos
PUT http://localhost:4000/animals/:id/photos/:photoId/thumbnail
DELETE http://localhost:4000/animals/:id/photos/:photoId
```

### 10. Data Export/Import
Export animal data to CSV/JSON, import from files.

```
GET http://localhost:4000/data/export?format=csv
POST http://localhost:4000/data/import
```

### 11. Transfer Requests
Request animals be transferred between organizations.

```
GET http://localhost:4000/transfers
POST http://localhost:4000/transfers
PUT http://localhost:4000/transfers/:id
```

---

## 📁 Project Structure

```
├── apps/
│   ├── api/              # Fastify REST API
│   │   └── src/
│   │       ├── index.ts       # Server entry
│   │       ├── routes/        # API routes
│   │       ├── services/      # Business logic
│   │       └── middleware/    # Auth, etc.
│   └── web/              # React frontend
│       └── src/
│           ├── pages/         # Page components
│           ├── components/    # UI components
│           └── hooks/         # Custom hooks
├── packages/
│   ├── database/         # Prisma schema & migrations
│   └── types/            # Shared TypeScript types
├── scripts/              # Setup & utility scripts
├── _archive/             # Production features (for later)
└── uploads/              # Local image storage
```

---

## 🛠 Available Commands

| Command | Description |
|---------|-------------|
| `npm run setup` | First-time setup (install, db, seed) |
| `npm run dev` | Start API and Web in dev mode |
| `npm run db:reset` | Delete DB and re-seed |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run build` | Production build |
| `npm run test:e2e` | Run Playwright E2E tests |

---

## 🗄 Database

This prototype uses **SQLite** for simplicity. The database file is at:
```
packages/database/dev.db
```

### View Data

```bash
npm run db:studio
```

This opens Prisma Studio at http://localhost:5555

### Reset Data

```bash
npm run db:reset
```

---

## 📷 Image Storage

Images are stored locally in `./uploads/{animalId}/{filename}`.

Served via: `http://localhost:4000/uploads/{animalId}/{filename}`

---

## 🔮 Roadmap to Production

See [apps/TODO.md](apps/TODO.md) for the full production checklist.

### High Priority
- [ ] PostgreSQL migration
- [ ] Docker setup
- [ ] Auth hardening (refresh tokens, rate limiting)
- [ ] S3/MinIO for images
- [ ] Enhanced risk scoring with ML

### Production Files
Archived production-ready code is in `_archive/`:
- Docker configuration
- Full Prisma schema (35+ models)
- Advanced risk scoring algorithm
- External integrations

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [apps/TODO.md](apps/TODO.md) | Production feature checklist |
| [docs/TESTING.md](docs/TESTING.md) | Testing guide |
| [docs/GOVERNANCE.md](docs/GOVERNANCE.md) | Project governance |
| [docs/ETHICAL_AI_GUIDELINES.md](docs/ETHICAL_AI_GUIDELINES.md) | AI ethics for risk scoring |
| [_archive/README.original.md](_archive/README.original.md) | Original full documentation |

---

## 🧪 Testing

### E2E Tests

```bash
npm run test:e2e
```

### E2E with UI

```bash
npm run test:e2e:ui
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 💙 Mission

> Every animal deserves a chance. ShelterLink helps ensure that chance is given fairly, transparently, and humanely.

Built with love for animals. 🐕 🐈 🐇
