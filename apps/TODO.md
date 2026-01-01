# ShelterLink - Production TODO

This document tracks features that were archived for the prototype and need to be re-integrated for production deployment.

## Quick Reference

- **Archive Location**: `/_archive/`
- **Original Schema**: `/_archive/prisma/schema.full.prisma`
- **Original Docker Setup**: `/_archive/docker/`

---

## Phase 1: Core Infrastructure (Priority: CRITICAL)

### Database Migration: SQLite → PostgreSQL

**Status**: 🔴 Not Started  
**Files**: `_archive/prisma/schema.full.prisma`

- [ ] Update `packages/database/prisma/schema.prisma` to use PostgreSQL
- [ ] Replace `provider = "sqlite"` with `provider = "postgresql"`
- [ ] Add PostgreSQL-specific features:
  - [ ] `gen_random_uuid()` for UUIDs
  - [ ] `@db.Text` for large text fields
  - [ ] Case-insensitive search with `mode: 'insensitive'`
  - [ ] Full-text search with `@@fulltext`
- [ ] Run `prisma migrate dev` to create migration files
- [ ] Update connection string in production env

### Docker & Container Setup

**Status**: 🔴 Not Started  
**Files**: `_archive/docker/docker-compose.yml`, `_archive/docker/Dockerfile.api`

- [ ] Restore `docker-compose.yml` to root
- [ ] Add PostgreSQL service
- [ ] Add Redis service  
- [ ] Add MinIO service (object storage)
- [ ] Update API Dockerfile for production
- [ ] Add health checks

### Authentication Hardening

**Status**: 🔴 Not Started  
**Current**: Simplified JWT (7-day expiry)

- [ ] Implement refresh token rotation
- [ ] Add Redis session store
- [ ] Implement rate limiting on auth endpoints
- [ ] Add password reset flow
- [ ] Add email verification
- [ ] Implement MFA (optional)
- [ ] Add OAuth providers (Google, Facebook)

---

## Phase 2: Storage & Media (Priority: HIGH)

### Object Storage: Local → MinIO/S3

**Status**: 🔴 Not Started  
**Current**: Local filesystem at `./uploads/`

- [ ] Set up MinIO or AWS S3 bucket
- [ ] Implement file upload service with presigned URLs
- [ ] Add image resizing/optimization
- [ ] Create thumbnail generation pipeline
- [ ] Add CDN integration for serving images
- [ ] Implement file type validation
- [ ] Add virus scanning

### Image Processing

**Status**: 🔴 Not Started

- [ ] Add Sharp for image resizing
- [ ] Create standard sizes: thumbnail (150x150), card (400x300), full (1200x900)
- [ ] Implement lazy loading on frontend
- [ ] Add WebP conversion for modern browsers

---

## Phase 3: Risk Scoring & ML (Priority: HIGH)

### Enhanced Risk Algorithm

**Status**: 🔴 Not Started  
**Files**: `_archive/services/risk-scoring.full.ts`

**Current Implementation (5 factors)**:
- Length of stay (40%)
- Senior status (20%)
- Special needs (20%)
- Large breed dogs (10%)
- Black animal bias (10%)

**Full Implementation Adds**:
- [ ] Shelter capacity pressure
- [ ] Breed surrender frequency
- [ ] Medical intervention needs
- [ ] Behavioral assessment scores
- [ ] Seasonal patterns
- [ ] ML-based predictions

### ML Model Integration

**Status**: 🔴 Not Started

- [ ] Set up Python ML service
- [ ] Train historical outcome predictor
- [ ] Create real-time risk adjustment API
- [ ] Add feature store for training data
- [ ] Implement A/B testing framework

---

## Phase 4: Communication & Notifications (Priority: MEDIUM)

### Email Service

**Status**: 🔴 Not Started

- [ ] Integrate email provider (SendGrid, SES, etc.)
- [ ] Create email templates:
  - [ ] Welcome email
  - [ ] Password reset
  - [ ] Adoption updates
  - [ ] Transfer notifications
  - [ ] At-risk alerts for volunteers
- [ ] Implement email preferences

### Push Notifications

**Status**: 🔴 Not Started

- [ ] Add web push notifications
- [ ] Create notification preferences UI
- [ ] Implement digest emails (daily/weekly)

---

## Phase 5: Integrations (Priority: MEDIUM)

### External API Integrations

**Status**: 🔴 Not Started  
**Files**: `_archive/routes/import.ts`

- [ ] Petfinder API sync
- [ ] Adopt-a-Pet integration
- [ ] RescueGroups.org integration
- [ ] State shelter databases
- [ ] License/microchip databases

### Webhook System

**Status**: 🔴 Not Started  
**Files**: `_archive/routes/webhooks.ts`

- [ ] Implement webhook delivery system
- [ ] Add webhook management UI
- [ ] Create retry logic with exponential backoff
- [ ] Add webhook signing for security

---

## Phase 6: Monitoring & Observability (Priority: MEDIUM)

### Logging & Metrics

**Status**: 🔴 Not Started

- [ ] Structured logging with Pino
- [ ] Request tracing
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring (APM)
- [ ] Database query analysis

### Audit Trail

**Status**: 🔴 Not Started

- [ ] Implement audit logging for all changes
- [ ] Create audit log viewer UI
- [ ] Add compliance reports
- [ ] HIPAA-style access logging (for sensitive data)

---

## Phase 7: Performance & Scale (Priority: MEDIUM)

### Caching

**Status**: 🔴 Not Started

- [ ] Add Redis caching layer
- [ ] Cache animal listings (5-min TTL)
- [ ] Cache organization data (15-min TTL)
- [ ] Implement cache invalidation
- [ ] Add ETag support

### Search Optimization

**Status**: 🔴 Not Started

- [ ] Implement Elasticsearch or Meilisearch
- [ ] Add full-text search for animal descriptions
- [ ] Implement fuzzy matching
- [ ] Add search analytics

---

## Phase 8: Compliance & Security (Priority: HIGH)

### Data Protection

**Status**: 🔴 Not Started

- [ ] Implement data encryption at rest
- [ ] Add field-level encryption for PII
- [ ] Create data retention policies
- [ ] Implement GDPR data export
- [ ] Add right-to-deletion workflow

### Security Hardening

**Status**: 🔴 Not Started

- [ ] Add Helmet.js security headers
- [ ] Implement CORS properly
- [ ] Add rate limiting (express-rate-limit)
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection
- [ ] CSRF tokens
- [ ] Security audit

---

## Phase 9: Frontend Enhancements (Priority: MEDIUM)

### Accessibility

**Status**: 🔴 Not Started

- [ ] WCAG 2.1 AA compliance audit
- [ ] Screen reader testing
- [ ] Keyboard navigation
- [ ] Color contrast verification
- [ ] Focus indicators

### PWA Features

**Status**: 🔴 Not Started

- [ ] Add service worker
- [ ] Implement offline mode
- [ ] Add install prompt
- [ ] Background sync for data

---

## Phase 10: Testing & Quality (Priority: HIGH)

### Test Coverage

**Status**: 🟡 Partial  
**Current**: E2E tests exist but may need updates

- [ ] Update E2E tests for new API
- [ ] Add unit tests for services
- [ ] Add integration tests for API routes
- [ ] Add visual regression tests
- [ ] Implement load testing

### CI/CD

**Status**: 🔴 Not Started

- [ ] Set up GitHub Actions
- [ ] Add automated testing on PR
- [ ] Add deployment pipelines
- [ ] Implement staging environment
- [ ] Add database migrations in CI

---

## Feature-Specific TODOs

### Humane Outcome Modal

**Status**: 🟡 API Complete, Frontend Pending

- [ ] Create `OutcomeModal.tsx` component
- [ ] Add celebration animations for adoptions
- [ ] Add respectful styling for euthanasia
- [ ] Implement memorial creation option
- [ ] Add outcome statistics dashboard

### Transfer Network

**Status**: 🟡 Basic Implementation

- [ ] Add real-time transfer status updates
- [ ] Implement transport coordination
- [ ] Add medical records sharing
- [ ] Create transfer history view
- [ ] Add bulk transfer requests

### Data Sync

**Status**: 🔴 Not Started  
**Current**: Export/Import exists, sync is placeholder

- [ ] Implement real-time sync protocol
- [ ] Add conflict resolution
- [ ] Create sync status dashboard
- [ ] Add scheduled sync jobs

---

## Migration Checklist

When ready to move to production:

### Pre-Migration
- [ ] Back up SQLite database
- [ ] Document current data state
- [ ] Create PostgreSQL instance
- [ ] Set up MinIO/S3 bucket

### Migration
- [ ] Run Prisma migrations
- [ ] Migrate data from SQLite
- [ ] Upload local images to object storage
- [ ] Update environment variables

### Post-Migration
- [ ] Verify all data transferred
- [ ] Test all API endpoints
- [ ] Run full E2E test suite
- [ ] Monitor for errors

---

## Archived Files Quick Reference

| Archived File | Purpose | Integration Notes |
|--------------|---------|-------------------|
| `_archive/docker/docker-compose.yml` | Full infra setup | Restore to root, update ports |
| `_archive/docker/Dockerfile.api` | Production API build | Restore to `apps/api/` |
| `_archive/routes/import.ts` | External data imports | Add after auth hardening |
| `_archive/routes/webhooks.ts` | Webhook system | Requires queue service |
| `_archive/services/risk-scoring.full.ts` | Full ML algorithm | Add ML service first |
| `_archive/prisma/schema.full.prisma` | 35+ models | Gradual migration |
| `_archive/README.original.md` | Original docs | Reference only |

---

*Last Updated: Auto-generated during prototype creation*
