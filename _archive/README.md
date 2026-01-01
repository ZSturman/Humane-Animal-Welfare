# Archived Files - Shelter Link

This folder contains files archived from the full production implementation. These should be referenced when upgrading the prototype to production.

## Contents

### `/docker/`
- **docker-compose.yml** - Full Docker Compose setup with PostgreSQL, Redis, MinIO
- **Dockerfile.api** - Production-ready API Dockerfile

**When to integrate:** When ready to deploy to production or need local Docker development environment.

### `/routes/`
- **import.ts** - Full data import system with field mapping, CSV/Excel parsing, background job processing
- **webhooks.ts** - Webhook management for external integrations (PetFinder, Adoptapet, etc.)

**When to integrate:** 
- `import.ts` - When you need bulk data import from other shelter management systems
- `webhooks.ts` - When integrating with external platforms or enabling real-time event notifications

### `/services/`
- **risk-scoring.full.ts** - Complete 470-line risk scoring algorithm with:
  - 6 weighted factors (LOS, medical, behavioral, capacity, adoptability, special categories)
  - ML-based adoptability prediction hooks
  - Historical data analysis
  - Configurable thresholds from types package
  - Kennel stress level detection
  - Capacity calculations

**When to integrate:** When you need sophisticated risk scoring with ML features. The prototype uses a simplified 5-factor algorithm.

### `/prisma/`
- **schema.full.prisma** - Complete 1584-line Prisma schema with 35+ models including:
  - Session management
  - API keys
  - Medical records, vaccinations, behavioral assessments
  - Audit logging
  - Webhooks and import jobs
  - Field mapping templates
  - Notifications and saved searches

**When to integrate:** When migrating to PostgreSQL and need full feature set.

### `/scripts/`
- **init-db.sql/** - PostgreSQL initialization scripts

**When to integrate:** When switching from SQLite to PostgreSQL.

---

## Production Migration Checklist

See `/docs/DEPLOYMENT.md` for full migration guide.

### Phase 1: Database
- [ ] Switch Prisma provider from `sqlite` to `postgresql`
- [ ] Restore models from `schema.full.prisma`
- [ ] Set up PostgreSQL (Docker or managed service)
- [ ] Run migrations

### Phase 2: Infrastructure  
- [ ] Restore `docker-compose.yml`
- [ ] Configure Redis for sessions and job queues
- [ ] Set up MinIO/S3 for file storage

### Phase 3: Features
- [ ] Integrate `risk-scoring.full.ts` for advanced risk calculation
- [ ] Add `import.ts` route for bulk data import
- [ ] Add `webhooks.ts` for external integrations
- [ ] Re-enable refresh tokens and session storage
- [ ] Add background job processing (BullMQ)

### Phase 4: Security
- [ ] Enable rate limiting
- [ ] Add API key authentication
- [ ] Enable account locking on failed attempts
- [ ] Set up audit logging
