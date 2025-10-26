SportAdmin Scraper Integration
==============================

## Status Overview

### PoC Implementation ✓ (Completed)
**Repository**: `sportadmin-scraper/`
**Stack**: TypeScript, Playwright, Node.js

**Capabilities**:
- Automated login via SportAdmin identity provider
- Attendance statistics scraping (practice filtering, player data from nested iframes)
- Upcoming matches scraping (Swedish date formats, future match filtering)
- Successfully handles Blazor UI and nested iframe architecture (`vpframe_3` → `iframe[name="printa"]`)

**Output**: JSON files for attendance and matches data
**Limitations**: .env credentials, no encryption, no Supabase integration, manual execution only

**See**: `sportadmin-scraper/README.md` for setup and usage

---

## Connector Integration Architecture

### Overview
Sport Wizard will support multiple team management providers through a unified "Connectors" system. Phase 1 implements SportAdmin; architecture designed for extensibility to support Svenska Lag, MyClub, and others.

### Security Architecture

**Encryption Strategy**: AES-256-GCM via Supabase Edge Function + Vault

**Flow**:
1. User enters credentials in Sport Wizard UI (HTTPS)
2. Credentials sent to Edge Function `connect-provider`
3. Edge Function retrieves master encryption key from Supabase Vault
4. Credentials encrypted with AES-256-GCM using team-specific IV/salt
5. Encrypted data stored in `team_connector` table
6. Scraper retrieves encrypted credentials and decrypts using same master key
7. Scraper uses decrypted credentials for one-time authentication

**Key Benefits**:
- Zero-knowledge architecture: Encrypted credentials opaque to database
- Team isolation: Unique IV/salt per team prevents cross-team decryption
- Centralized key management via Supabase Vault
- Complete audit trail of access and operations
- Key rotation support without re-encrypting all credentials

### Database Schema

**See**: `ai-specs/connector_schema.sql` for complete schema

#### Scraper Authentication
- The scraper runs with a Supabase service-role key stored in its runtime environment (e.g., container secret or GitHub Actions secret for deployments).
- The key must be scoped to service-role because RLS policies gate insert/update/delete access on `auth.jwt()->>'role' = 'service_role'`.
- Local development should load the key via `.env` (never committed) while production deploys source it from the hosting provider’s secret store.
- Rotating the service key requires updating both the scraper environment and any related Edge Functions; coordinate with Vault key management procedures.

#### Connector Status Lifecycle
- `verifying`: set on connector creation or when the user retries after an error; a verification job is queued and no scheduled syncs run yet.
- `connected`: first successful job (manual or scheduled) promotes the connector to active status; scheduled syncs resume from here.
- `error`: credential/authentication failures or other hard blockers move the connector into error; scheduled jobs pause and the UI prompts the user to reconnect.
- `disconnected`: user intentionally disables the connector; jobs should not be enqueued while in this state and the edge function should clear/suspend schedules.

#### Sync Job Semantics
- `manual`: user-initiated refresh; respects connector status (won’t run while `disconnected`).
- `scheduled`: background refresh driven by the scheduler; pause while the connector is `verifying` or `error`.
- `verification`: short-lived health check triggered on creation or user retry; success promotes connector to `connected`, failure keeps it in `error`.
- Error handling:
  - `auth_*` codes (e.g., `auth_invalid_credentials`, `auth_account_locked`) mark the job `failed`, set connector status to `error`, and cancel/pause scheduled jobs until the user re-validates credentials.
  - `scrape_*` codes (e.g., `scrape_dom_mismatch`, `scrape_timeout`) mark the job `failed` but leave the connector `connected`; scheduler retries with backoff and UI shows a warning banner.

**Core Tables**:
- `team_connector` - Encrypted credentials per team/provider
- `team_connector_sync_job` - Job queue for scraper
- `player_attendance` / `upcoming_match` - Provider data snapshots
- Enums: `connector_provider`, `connector_status`, `sync_job_status`

**Key Design Decisions**:
- Provider-agnostic schema (supports multiple providers)
- RLS policies enforce team-based access control
- Audit fields (created_by, created_at, last_updated_by, updated_at)
- JSON columns for provider-specific configuration and results

### Implementation Phases

#### Phase 1: Database Migration
**File**: `supabase/migrations/YYYYMMDD_team_connectors.sql`

Tasks:
- Create enums for connector_provider, connector_status, sync_job_status
- Create team_connector table with encrypted credential storage
- Create team_connector_sync_job table for job queue
- Add provider data tables (player_attendance, upcoming_match)
- Add RLS policies for team-based access control
- Set up audit triggers (updated_at, last_updated_by)

#### Phase 2: Edge Function - Credential Encryption
**File**: `supabase/functions/connect-provider/index.ts`

Features:
- Validate provider, username, password inputs
- Retrieve master encryption key from Supabase Vault
- Generate team-specific IV and salt
- Encrypt credentials using Web Crypto API (AES-256-GCM)
- Store encrypted blob, IV, and salt in team_connector table
- Create verification sync job to test connection
- Rate limiting and bot detection (following existing patterns)
- Comprehensive security logging

Security Measures:
- Input validation (length limits, format checks)
- Bot detection scoring system
- Multi-tier rate limiting (IP, user, global)
- CORS headers and security headers
- Correlation IDs for request tracking
- Structured security event logging

#### Phase 3: UI Components
**Files**:
- `src/components/connectors/ConnectorsSection.js` - Main section in TeamManagement Preferences tab
- `src/components/connectors/SportAdminConnectModal.js` - Connection modal with credential form
- `src/components/connectors/ConnectorCard.js` - Display connected providers with status
- `src/components/connectors/DisconnectConfirmModal.js` - Disconnect confirmation with warnings
- `src/services/connectorService.js` - API client for connector operations

**Integration Point**: TeamManagement component → PREFERENCES tab → Connectors section

UI Features:
- Provider selection (SportAdmin, Svenska Lag - coming soon)
- Credential input form with password visibility toggle
- Connection status indicators (connected, disconnected, error)
- Last sync timestamp and result summary
- Manual sync trigger button
- Disconnect with confirmation modal
- Error handling and user feedback

#### Phase 4: Scraper Integration
**Files**:
- `sportadmin-scraper/src/config/supabase.ts` - Supabase client configuration
- `sportadmin-scraper/src/services/jobProcessor.ts` - Job queue polling and processing
- `sportadmin-scraper/src/utils/encryption.ts` - Credential decryption utilities
- `sportadmin-scraper/src/types/connector.ts` - TypeScript interfaces

Features:
- Poll team_connector_sync_job table for pending jobs (configurable interval)
- Retrieve encrypted credentials from team_connector for job's team
- Decrypt credentials using master key from Vault
- Execute scraper with decrypted credentials
- Parse and structure scraped data
- Persist attendance snapshots and upcoming matches
- Update job status (running → completed/failed)
- Error handling with detailed error messages
- Retry logic with exponential backoff (max 3 retries)

Data Flow:
```
Job Queue → Fetch Encrypted Creds → Decrypt → Scrape → Store Results → Update Job
```

#### Phase 5: Vault Setup & Security Hardening
Tasks:
- Configure Supabase Vault for encryption key storage
- Generate and store master encryption key
- Set up key rotation policy (quarterly recommended)
- Configure environment variables for scraper
- Document key management procedures
- Set up monitoring and alerting for failed jobs
- Implement key rotation procedures

Key Management:
- Master key stored in Supabase Vault (vault.secrets table)
- Key versioning support for rotation
- Old keys retained temporarily for decryption during rotation
- Access logging for all Vault operations

#### Phase 6: Testing & Monitoring
Test Coverage:
- Unit tests for encryption/decryption functions
- Integration tests for Edge Function (credential flow)
- UI component tests (modal interactions, form validation)
- End-to-end test: Connect → Verify → Scrape → Disconnect
- Security audit of encryption implementation
- Load testing for job queue processing

Monitoring:
- Job success/failure rates
- Scraping duration metrics
- Error categorization (auth failures, scraping errors, network issues)
- Encryption/decryption performance
- Vault access patterns
- Rate limiting trigger counts

### Deployment Architecture

**Recommended Hosting**: AWS ECS on Fargate

**Cost Estimate** (us-east-1):
- Free tier (12 months): 750 vCPU hours + 1.5 GB RAM hours
- Post free-tier: 0.25 vCPU / 0.5 GB task @ 24/7 ≈ $9/month
- Secrets Manager: $0.40/secret + $0.05/10k API calls

**Infrastructure**:
- ECS Cluster with Fargate tasks
- Task Definition: Playwright + Node.js container (~1 GB)
- EventBridge scheduler for periodic job processing
- CloudWatch Logs for monitoring
- VPC configuration with restricted outbound access

**Alternatives**:
- EC2 t3.micro/t4g.micro (free tier, more control)
- Lambda container image (viable for <15 min scrapes, adds complexity)

**Operational Best Practices**:
- Rate limit scraping to respect SportAdmin ToS
- Monitor for SportAdmin layout changes (screenshot comparison)
- Implement scraping failure alerts (email/Slack)
- Set up usage metrics and cost tracking
- Regular credential rotation prompts
- User consent tracking and audit trail

### Extensibility for Future Providers

**Design Principles**:
- Provider-agnostic database schema (provider column with enum)
- Provider-specific modal components (SportAdminConnectModal, SvenskaLagConnectModal)
- Connector card displays provider logo and name
- Provider-specific scraper implementations in separate modules
- Shared encryption/decryption utilities
- Unified job queue and snapshot storage

**Adding New Provider** (e.g., Svenska Lag):
1. Add provider to connector_provider enum
2. Create provider-specific connect modal component
3. Implement provider-specific scraper module
4. Add provider logo and branding assets
5. Update ConnectorsSection to show new provider
6. Test connection and scraping flows

---

## Implementation Status

- [x] PoC scraper validated (sportadmin-scraper/)
- [ ] Phase 1: Database migration (connector_schema.sql documented)
- [ ] Phase 2: Edge Function for credential encryption
- [ ] Phase 3: UI components for connector management
- [ ] Phase 4: Scraper integration with job queue
- [ ] Phase 5: Vault setup and security hardening
- [ ] Phase 6: Testing and monitoring

**Next Immediate Step**: Implement Phase 1 database migration
