SportAdmin Scraper Integration
==============================

## Current Status

A working proof-of-concept (PoC) scraper has been implemented as a standalone TypeScript CLI tool. The PoC successfully demonstrates the technical feasibility of extracting data from SportAdmin's Blazor-based web interface.

### PoC Implementation (Completed)

**Repository**: `sportadmin-scraper/`

**Technology Stack**:
- TypeScript with strict type checking
- Playwright for browser automation (Chromium)
- dotenv for configuration management
- Node.js runtime

**Implemented Features**:
1. **Authentication**: Automated login flow via SportAdmin's identity provider
2. **Attendance Statistics Scraping**:
   - Navigates to Närvarostatistik (attendance statistics)
   - Filters by "Träning" (practice) activity type
   - Extracts player attendance data from nested iframe structure
   - Captures total practice count, individual attendance counts, and percentages
   - Outputs: `scraped-data/attendance-data.json`

3. **Upcoming Matches Scraping**:
   - Navigates to Matcher (matches) page
   - Parses match table with Swedish date/time formats
   - Filters for future matches only
   - Extracts date (YYYY-MM-DD), time, teams, and venue
   - Outputs: `scraped-data/matches-data.json`

**Technical Achievements**:
- Successfully navigates SportAdmin's complex nested iframe architecture (`vpframe_3` → `iframe[name="printa"]`)
- Handles Blazor component hydration timing with empirically tuned waits
- Robust data extraction with defensive error handling
- Structured TypeScript interfaces for scraped data
- Screenshot capture for debugging and verification

**Example Output**:
```json
// attendance-data.json
{
  "totalPractices": 64,
  "attendance": [
    {
      "playerName": "Léonie Kärde",
      "totalAttendance": 63,
      "percentage": "98%"
    }
  ]
}

// matches-data.json
{
  "upcomingMatches": [
    {
      "date": "2025-11-23",
      "time": "09:45 - 11:30",
      "teams": "Lidingö 8 - Djurgårdens IF Fotboll",
      "venue": "Rudboda konstgräsplan"
    }
  ]
}
```

**Current Usage**:
```bash
# Setup
npm install
npx playwright install chromium
cp .env.example .env  # Add SPORTADMIN_USERNAME and SPORTADMIN_PASSWORD

# Run
npm run dev    # Development mode with hot reload
npm run build  # Production build
npm start      # Run built version
```

**Limitations of PoC**:
- Credentials stored in `.env` file (no encryption)
- No Supabase integration
- No job queue system
- Manual execution only (no scheduling)
- No error recovery or retry logic
- Browser runs in non-headless mode by default for debugging

---

## Future Integration Architecture

The PoC validates the scraping approach. The next phase involves integrating the scraper with Sport Wizard's Supabase backend and deploying it as a managed service.

### High-Level Architecture (Planned)
- Keep the scraper as a standalone service (Playwright worker). This isolates browser dependencies, reduces blast radius, and lets us deploy fixes without touching the main React app.
- Sport Wizard collects SportAdmin credentials/tokens via a new "Connect SportAdmin" page. Submission hits a Supabase Edge Function that encrypts and stores credentials plus inserts a row into a `sportadmin_sync_jobs` table.
- The scraper service polls the job table (or listens via Supabase Realtime) for pending work, decrypts credentials using a KMS-backed secret, and runs the headless browser automation.
- Normalized output (events, attendance) is written back into shared Supabase tables such as `sportadmin_events` and `sportadmin_attendance`. The job row is updated with status, timestamps, and failure details if any.
- Sport Wizard subscribes to job updates for progress feedback; users can trigger manual syncs by inserting new jobs, and scheduled syncs can be created via a Supabase cron Edge Function that does the same.

### Recommended Hosting (AWS Focus)
- **Primary**: AWS ECS on Fargate. During the free tier (first 12 months), 750 vCPU hours and 1.5 GB RAM hours cover light scraping workloads. Post free-tier pricing (us-east-1) runs ~$0.0405 per vCPU-hour and ~$0.00445 per GB-hour; e.g., a 0.25 vCPU/0.5 GB task running 24/7 costs about $9/month. Secrets Manager stores credentials; EventBridge schedules periodic tasks.
- **Alternatives**: EC2 `t3.micro`/`t4g.micro` in the free tier (12 months) for a persistent VM; good if we prefer direct OS control. Lambda container image is viable for short scrapes (<15 minutes) but adds packaging friction for headless Chromium.
- Regardless of platform, ship metrics/logs to CloudWatch, restrict outbound access, and rotate credentials regularly.

### Operational Considerations
- Enforce explicit user consent before storing SportAdmin credentials; encrypt at rest and in transit.
- Rate-limit scraping to respect SportAdmin's terms and avoid triggering bot defenses; monitor layout changes to catch breakages quickly.
- Provide admin tooling or Supabase RPC endpoints to revoke credentials, replay failed jobs, and inspect recent runs.
- Keep Supabase schema changes documented (new tables/functions) and cover scraping logic with integration tests that run against mocked SportAdmin HTML.
- Define AWS infrastructure (ECS cluster, Fargate task, Secrets Manager secrets, EventBridge schedules, IAM roles) via AWS CDK in TypeScript so the scraper stack stays versioned, reviewable, and reproducible.

### Technology Decision: Playwright ✓
- **Selected**: Playwright for its robust auto-waiting, tracing capabilities, and multi-browser support
- **Rationale**: PoC demonstrated Playwright handles SportAdmin's complex Blazor/iframe structure reliably
- **Container Size**: ~1 GB (acceptable trade-off for resilience)
- Alternative (Puppeteer) remains viable if container size becomes a constraint

---

## Next Steps

1. **Supabase Integration**:
   - Design database schema for `sportadmin_sync_jobs`, `sportadmin_events`, and `sportadmin_attendance` tables
   - Implement Edge Function for credential encryption/storage
   - Add Supabase client to scraper for reading jobs and writing results

2. **Credential Management**:
   - Integrate AWS Secrets Manager or Supabase Vault
   - Implement encryption at rest for stored credentials
   - Add credential rotation mechanism

3. **Job Queue System**:
   - Implement job polling or Realtime subscription
   - Add job status tracking (pending → running → completed/failed)
   - Implement retry logic with exponential backoff

4. **Deployment**:
   - Containerize scraper with Dockerfile
   - Set up AWS ECS/Fargate infrastructure with CDK
   - Configure CloudWatch logging and monitoring
   - Implement health checks and auto-restart

5. **Sport Wizard UI**:
   - Add "Connect SportAdmin" settings page
   - Implement manual sync trigger
   - Display sync status and last sync timestamp
   - Show scraped attendance and match data in app

6. **Testing & Monitoring**:
   - Add integration tests with mocked SportAdmin HTML
   - Implement scraping failure alerts
   - Monitor for SportAdmin layout changes
   - Set up usage metrics and cost tracking
