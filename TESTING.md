# CRM Agent Prospecting System - Testing Guide

## Table of Contents
1. [Setup & Prerequisites](#setup--prerequisites)
2. [Starting the Services](#starting-the-services)
3. [Feature Testing](#feature-testing)
4. [Integration Testing](#integration-testing)
5. [Troubleshooting](#troubleshooting)

---

## Setup & Prerequisites

### Required Services
- **Node.js** 16+
- **Python** 3.10+
- **PostgreSQL** 14+ (or test with memory fallback)
- **Redis** 6+ (optional, for job queue testing)
- **Groq API Key** (https://console.groq.com)

### API Keys (Optional, for testing specific features)
```bash
GROQ_API_KEY=your_groq_api_key
RESEND_API_KEY=your_resend_key           # For email sending
SERPER_API_KEY=your_serper_key           # For web discovery
APOLLO_API_KEY=your_apollo_key           # For enrichment
FIRECRAWL_API_KEY=your_firecrawl_key     # For page extraction
LANGFUSE_PUBLIC_KEY=your_langfuse_key    # For tracing
LANGFUSE_SECRET_KEY=your_langfuse_secret # For tracing
CALENDLY_API_KEY=your_calendly_key       # For meeting booking
```

### Quick Setup
```bash
# 1. Install backend dependencies
cd backend
npm install

# 2. Install Python dependencies
cd ../agent
pip install -r requirements.txt

# 3. Create .env files
cp backend/.env.example backend/.env
echo "DATABASE_URL=postgresql://user:pass@localhost:5432/crm_agent" >> backend/.env
echo "GROQ_API_KEY=your_key_here" >> agent/.env

# 4. Start PostgreSQL (if using Docker)
docker run --name postgres14 -e POSTGRES_PASSWORD=password -d -p 5432:5432 postgres:14

# 5. Start Redis (if available)
redis-server
```

---

## Starting the Services

### Terminal 1: Backend (Node.js + Express)
```bash
cd backend
npm run dev
# Expected output:
# ✅ Backend listening on http://localhost:3001
```

### Terminal 2: Python Agent Runtime (Flask + LangGraph)
```bash
cd agent
python main.py
# Expected output:
# WARNING: This is a development server. Do not use it in production.
# Running on http://127.0.0.1:8000
```

### Terminal 3: Frontend (Vite)
```bash
cd frontend
npm run dev
# Expected output:
# ➜  Local:   http://localhost:5173/
```

---

## Feature Testing

### 1. **Email Sending (Resend Integration)**

#### Setup
```bash
# Add to backend/.env:
RESEND_API_KEY=your_actual_resend_key
```

#### Test Flow
```bash
POST http://localhost:3001/api/prospecting/run
Content-Type: application/json

{
  "action": "run_full_flow",
  "userid": "test-user-123",
  "lead": {
    "email": "test@example.com",
    "company": "TechCorp",
    "name": "John Doe",
    "role": "CTO"
  },
  "context": {
    "sender_domain": "yourcompany.com",
    "require_human_approval": false
  }
}
```

#### Expected Result
- **If `RESEND_API_KEY` is set:** Status shows "email_send_results" with `status: "sent"` and `email_id`
- **If key missing:** Status shows `status: "pending_approval"` with fallback message
- Response includes trace steps: `personalization:complete` → `guardrails:complete` → `email_sender:complete`

#### Verify in Code
```python
# agent/agents/email_sender/node.py
# Check logs for: "[email_sender] sent: 1, pending_approval: 0, errors: 0"
```

---

### 2. **Guardrails & Rate Limiting**

#### Test 1: Normal Flow (Should Pass)
```bash
POST http://localhost:3001/api/prospecting/run

{
  "action": "run_full_flow",
  "userid": "user-1",
  "lead": {...},
  "context": {
    "emails_sent_today": 2,
    "sender_domain": "verified-domain.com",
    "require_human_approval": false,
    "unsubscribe_list": []
  }
}
```

**Expected:** `guardrails.is_compliant: true`, `can_send_email: true`

#### Test 2: Hit Daily Limit (Should Block)
```bash
{
  ...same as above...
  "context": {
    "emails_sent_today": 500,  # Exceeds typical daily limit
    "sender_domain": "verified-domain.com"
  }
}
```

**Expected:** 
```json
{
  "guardrails": {
    "is_compliant": false,
    "violations": ["Daily email limit (500) reached for domain 'verified-domain.com'"],
    "can_send_email": false
  }
}
```

#### Test 3: Suppression List (Should Block)
```bash
{
  ...same as above...
  "context": {
    "unsubscribe_list": ["test@example.com"]
  },
  "lead": {
    "email": "test@example.com"  # On suppression list
  }
}
```

**Expected:**
```json
{
  "guardrails": {
    "violations": ["Recipient test@example.com is on unsubscribe list"],
    "can_send_email": false
  }
}
```

#### Test 4: Unverified Domain (Warning)
```bash
{
  ...same as above...
  "context": {
    "sender_domain": "unverified.com"
  }
}
```

**Expected:**
```json
{
  "guardrails": {
    "is_compliant": true,
    "warnings": ["Sender domain 'unverified.com' not fully verified"],
    "daily_send_limit": 50  # Conservative for unverified
  }
}
```

**Verify in Code:**
```python
# agent/agents/guardrails/node.py
# Run tests: python -m pytest agent/agents/guardrails/
```

---

### 3. **Langfuse Tracing (Observability)**

#### Setup
```bash
# Add to agent/.env or backend/.env:
LANGFUSE_PUBLIC_KEY=pk_your_key
LANGFUSE_SECRET_KEY=sk_your_key
```

#### Test
```bash
# Make a prospecting request (same as email sending test)
POST http://localhost:3001/api/prospecting/run
```

#### Verify in Langfuse Dashboard
1. Go to https://cloud.langfuse.com
2. Check **Traces** section
3. You should see:
   - `groq_llama_3_3_70b_versatile` spans (personalization)
   - `groq_llama_3_1_8b_instant` spans (routing)
   - Each with input/output, token counts, latency

#### If Keys Missing
System gracefully disables tracing:
```python
# agent/common/groq_client.py
self.langfuse = None  # Silently disabled, no errors
```

---

### 4. **Calendly Integration**

#### Setup
```bash
# Add to backend/.env:
CALENDLY_API_KEY=your_calendly_token
CALENDLY_ORGANIZER_USERNAME=your_username
```

#### Test
```bash
POST http://localhost:3001/api/prospecting/run

{
  "action": "run_full_flow",
  "userid": "user-1",
  "lead": {...},
  "context": {
    "calendly_organizer": "your_username",
    "require_human_approval": false
  }
}
```

#### Expected Result
```json
{
  "sequence": {
    "steps": [
      {"step": 1, "channel": "email", "subject": "..."},
      {"step": 2, "channel": "email", "subject": "..."},
      {"step": 3, "channel": "email", "subject": "..."},
      {"step": 4, "channel": "linkedin", "body": "..."},
      {
        "step": 5,
        "channel": "calendly",
        "booking_url": "https://calendly.com/your_username",
        "subject": "Let's schedule a time to chat"
      }
    ]
  }
}
```

**Verify in Code:**
```python
# agent/agents/personalization/node.py line 48
# Check: if calendly_organizer: booking_step appended
```

---

### 5. **Redis Job Queue (BullMQ)**

#### Setup
```bash
# Start Redis (locally or Docker)
redis-cli ping  # Should respond: PONG

# Add to backend/.env:
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
USE_JOB_QUEUE=true
```

#### Test Async Job Submission
```bash
POST http://localhost:3001/api/prospecting/run

{
  "action": "queue_prospecting_job",
  "userid": "user-1",
  "lead": {...}
}
```

#### Expected Response
```json
{
  "status": "queued",
  "jobId": "prospecting-user-1-1711359600000",
  "message": "Prospecting job queued successfully"
}
```

#### Check Job Status
```bash
GET http://localhost:3001/api/prospecting/job-status?jobId=prospecting-user-1-1711359600000&queue=prospecting
```

#### Expected Response
```json
{
  "status": "completed",
  "progress": 100,
  "data": { ...full result... }
}
```

#### Fallback Test (No Redis)
- Stop Redis server
- Set `REDIS_HOST=invalid-host` in `.env`
- Make prospecting request
- **Expected:** Request still succeeds with sync processing (no queuing)

**Verify in Code:**
```typescript
// backend/src/jobs/queue.ts
// Logs: "[Redis] Connected for job queue" when available
// Graceful fallback when unavailable
```

---

### 6. **Webhook Ingestion (Email Provider Signals)**

#### Setup
Create a test webhook receiver (optional):
```bash
# In a separate terminal, run:
npm install -g http-server
echo "Webhook received at $(date)" >> webhook-log.txt
```

#### Test: Send Email Signal
```bash
POST http://localhost:3001/api/webhooks/email
Content-Type: application/json

{
  "provider": "resend",
  "lead_email": "prospect@example.com",
  "event_type": "open",
  "event_data": {
    "timestamp": "2026-03-26T10:30:00Z",
    "user_agent": "Mozilla/5.0..."
  },
  "api_key": "your_api_key"
}
```

#### Expected Response
```json
{
  "status": "received",
  "message": "Engagement signal received and queued for processing",
  "signal_id": "uuid-here",
  "job_id": "signal-job-uuid"
}
```

#### Verify in Database
```bash
# Connect to PostgreSQL
psql -d crm_agent_db

# Query saved signals
SELECT * FROM engagement_signals WHERE lead_email = 'prospect@example.com';
```

#### Test All Event Types
```bash
# Test different event types
for event in "open" "click" "reply" "bounce" "unsubscribe"; do
  curl -X POST http://localhost:3001/api/webhooks/email \
    -H "Content-Type: application/json" \
    -d "{
      \"provider\": \"sendgrid\",
      \"lead_email\": \"test@example.com\",
      \"event_type\": \"$event\",
      \"event_data\": {\"timestamp\": \"$(date -Iseconds)\"},
      \"api_key\": \"test_key\"
    }"
done
```

#### Test Replay
```bash
POST http://localhost:3001/api/webhooks/replay/signal-uuid-here

{
  "lead_email": "prospect@example.com",
  "event_type": "click",
  "event_data": {"link": "https://example.com"},
  "provider": "resend"
}
```

**Verify in Code:**
```typescript
// backend/src/routes/webhooks.ts
// Check Console: "[Webhook] Error processing" or "signal received"
```

---

### 7. **Human Approval Gate**

#### Setup
```bash
# Set in backend/.env:
HUMAN_APPROVAL_REQUIRED=true
```

#### Test Flow

**Step 1: Generate Approval Request**
```bash
POST http://localhost:3001/api/prospecting/run

{
  "action": "run_full_flow",
  "userid": "user-1",
  "context": {
    "require_human_approval": true
  }
}
```

**Expected:** Request pauses at `guardrails` stage with:
```json
{
  "guardrails": {
    "can_send_email": false,
    "violations": ["Awaiting human approval for first outbound"]
  }
}
```

**Step 2: Check Pending Approvals**
```bash
GET http://localhost:3001/api/approvals/pending
Authorization: Bearer your_jwt_token
```

**Expected:**
```json
{
  "status": "success",
  "count": 1,
  "approvals": [
    {
      "id": "approval-uuid",
      "userid": "user-1",
      "lead_email": "prospect@example.com",
      "lead_name": "John Doe",
      "status": "pending",
      "sequence_json": { ...full sequence... },
      "created_at": "2026-03-26T10:00:00Z"
    }
  ]
}
```

**Step 3: Approve Sequence**
```bash
POST http://localhost:3001/api/approvals/approval-uuid/approve
Authorization: Bearer your_jwt_token
Content-Type: application/json

{
  "comment": "Looks good, ready to send"
}
```

**Expected:**
```json
{
  "status": "approved",
  "message": "Outbound sequence approved. Emails will be sent.",
  "approval": {
    "status": "approved",
    "approved_by": "user-1",
    "approved_at": "2026-03-26T10:05:00Z"
  }
}
```

**Step 4: Reject Alternative**
```bash
POST http://localhost:3001/api/approvals/another-uuid/reject
Authorization: Bearer your_jwt_token
Content-Type: application/json

{
  "reason": "Company is on do-not-call list"
}
```

**Expected:**
```json
{
  "status": "rejected",
  "message": "Sequence rejected. No emails will be sent."
}
```

#### Verify in Database
```bash
SELECT * FROM approval_requests WHERE userid = 'user-1' ORDER BY created_at DESC;
```

**Verify in Code:**
```typescript
// backend/src/routes/approvals.ts
// Test: npm test (if test suite exists)
```

---

## Integration Testing

### End-to-End Prospecting Flow

#### Full Flow with All Features

```bash
# Terminal 1: Start backend
cd backend && npm run dev

# Terminal 2: Start agent runtime
cd agent && python main.py

# Terminal 3: Run integration test
POST http://localhost:3001/api/prospecting/run
Content-Type: application/json

{
  "action": "run_full_flow",
  "userid": "integration-test-user",
  "lead": {
    "email": "prospect@techcorp.io",
    "company": "TechCorp Inc",
    "name": "Alice Smith",
    "role": "VP Sales"
  },
  "context": {
    "sender_domain": "mycompany.com",
    "emails_sent_today": 5,
    "require_human_approval": true,
    "unsubscribe_list": [],
    "calendly_organizer": "sales_team"
  }
}
```

#### Expected Full Trace
```
✅ target_discovery:complete
✅ fit_scoring:complete
✅ research_brief:complete
✅ personalization:complete
✅ guardrails:complete
❌ (blocked by approval)
```

#### After Approval
```bash
POST http://localhost:3001/api/approvals/{approval_id}/approve
```

**Then email_sender runs:**
```
✅ email_sender:complete
✅ engagement_adaptation:complete
✅ qa_compliance:complete
```

#### Verify All Persisted Data
```bash
psql -d crm_agent_db

# Approval was created and approved
SELECT * FROM approval_requests WHERE userid = 'integration-test-user';

# Prospecting run was saved
SELECT * FROM prospecting_run_snapshots WHERE userid = 'integration-test-user';

# If webhooks were sent
SELECT * FROM engagement_signals WHERE userid = 'integration-test-user';
```

---

### Webhook Simulation Test

```bash
# 1. Run prospecting flow (creates email with tracking)
# 2. Simulate engagement signals
POST http://localhost:3001/api/webhooks/email
{
  "provider": "resend",
  "lead_email": "prospect@techcorp.io",
  "event_type": "open",
  "event_data": {"timestamp": "$(date -Iseconds)"},
  "api_key": "test"
}

# 3. Verify signal was saved
psql -d crm_agent_db -c \
  "SELECT * FROM engagement_signals WHERE lead_email = 'prospect@techcorp.io';"

# 4. Check if job was queued (if Redis available)
# Should see engagement_adaptation triggered automatically
```

---

## Troubleshooting

### Common Issues

#### 1. Backend Won't Start
```bash
# Error: DATABASE_URL not set
Solution: Set in .env or start without DB (fallback mode)
export DATABASE_URL=postgresql://user:pass@localhost:5432/crm_agent

# Error: Port 3001 already in use
Solution: Kill existing process or use different port
lsof -ti:3001 | xargs kill -9
# Or set PORT=3002 in .env
```

#### 2. Python Agent Won't Run
```bash
# Error: Module not found
Solution: Install requirements
pip install -r agent/requirements.txt

# Error: GROQ_API_KEY missing
Solution: Set environment variable
export GROQ_API_KEY=your_key
# Agent will work with fallback responses

# Error: Port 8000 in use
Solution: Change port in agent/main.py
app.run(debug=True, port=8001)
```

#### 3. Database Connection Failed
```bash
# Error: Connection refused
Solution: Ensure PostgreSQL is running
docker run --name postgres14 -e POSTGRES_PASSWORD=pass -d -p 5432:5432 postgres:14

# Check connection
psql -h localhost -U postgres -d postgres -c "SELECT 1"

# If no DB available, system runs in memory-only mode
# Set: PROSPECTING_SNAPSHOT_FALLBACK_MEMORY=true
```

#### 4. Email Not Sending
```bash
# Check if RESEND_API_KEY set
grep RESEND_API_KEY backend/.env

# If missing, emails queue with status "pending_approval"
# This is by design (graceful fallback)

# Verify Resend account:
# 1. Go to https://resend.io
# 2. Get API key from settings
# 3. Verify sender domain is added
```

#### 5. Webhooks Not Received
```bash
# Check if route mounted
grep "webhookRouter" backend/src/index.ts
# Should show: app.use("/api/webhooks", webhookRouter)

# Test endpoint exists
curl -X POST http://localhost:3001/api/webhooks/email \
  -H "Content-Type: application/json" \
  -d '{"provider":"resend","lead_email":"test@test.com","event_type":"open","event_data":{},"api_key":"test"}'

# Check logs for errors
# Should see: "[Webhook] Error processing" or "signal received and queued"
```

#### 6. Approval Gate Not Working
```bash
# Verify flag is enabled
grep HUMAN_APPROVAL_REQUIRED backend/.env
# Should be: HUMAN_APPROVAL_REQUIRED=true

# Check if approvals table exists
psql -d crm_agent_db -c "\dt approval_requests"

# Verify route mounted
grep "approvalRouter" backend/src/index.ts
# Should show: app.use("/api/approvals", approvalRouter)

# Test GET endpoint
curl http://localhost:3001/api/approvals/pending \
  -H "Authorization: Bearer test_token"
```

#### 7. Redis Not Connecting
```bash
# Check if Redis running
redis-cli ping
# Expected: PONG

# Start Redis (if using Docker)
docker run --name redis -d -p 6379:6379 redis:latest

# Check queue config
grep REDIS backend/.env
# Should have: REDIS_HOST, REDIS_PORT

# Test queue manually
cd backend
npm install redis
node -e "
  const redis = require('redis');
  const client = redis.createClient();
  client.on('connect', () => console.log('✅ Redis connected'));
  client.on('error', (err) => console.log('❌', err.message));
"
```

---

## Test Checklist

Use this checklist to validate all features:

```
[ ] Email Sending
  [ ] Without API key (pending_approval)
  [ ] With API key (sent)
  [ ] Multiple steps in sequence

[ ] Guardrails
  [ ] Domain verified (passes)
  [ ] Domain unverified (warning)
  [ ] Daily limit exceeded (blocks)
  [ ] Recipient on suppression list (blocks)
  [ ] Human approval required (blocks)

[ ] Langfuse Tracing
  [ ] Keys configured (traces recorded)
  [ ] Keys missing (silently disabled)
  [ ] Traces visible in Langfuse dashboard

[ ] Calendly
  [ ] Organizer configured (booking step added)
  [ ] Organizer missing (no booking step)
  [ ] Booking URL populated correctly

[ ] Job Queue
  [ ] Redis available (async jobs)
  [ ] Redis unavailable (sync fallback)
  [ ] Job status retrieval
  [ ] Failed job retry logic

[ ] Webhooks
  [ ] Signal saved to database
  [ ] Job queued for processing
  [ ] All event types (open, click, reply, bounce, etc)
  [ ] Signal replay functionality

[ ] Approval Gate
  [ ] Pending approvals listed
  [ ] Sequence approved (sends email)
  [ ] Sequence rejected (no email)
  [ ] Approval status persisted

[ ] End-to-End
  [ ] Full flow with all services
  [ ] Fallback mode (services missing)
  [ ] Database roundtrip
  [ ] API error handling
```

---

## Performance Testing

### Load Testing
```bash
# Install artillery
npm install -g artillery

# Create load-test.yml
cat > load-test.yml << 'EOF'
config:
  target: "http://localhost:3001"
  phases:
    - duration: 60
      arrivalRate: 5
scenarios:
  - name: "Prospecting Flow"
    flow:
      - post:
          url: "/api/prospecting/run"
          json:
            action: "run_full_flow"
            userid: "{{ $randomNumber(1, 1000) }}"
            lead:
              email: "test{{ $randomNumber(1, 10000) }}@example.com"
              company: "Company {{ $randomNumber(1, 100) }}"
              name: "Lead {{ $randomNumber(1, 1000) }}"
              role: "CTO"
EOF

# Run test
artillery run load-test.yml
```

### Expected Results
- Response time: < 5 seconds for full flow
- Error rate: < 1%
- Throughput: 5-10 prospecting runs/second

---

## Next Steps

1. **Deploy to staging** with real API keys
2. **Monitor Langfuse** for performance insights
3. **Test email delivery** with real domain verification
4. **Set up webhook receivers** from email providers
5. **Configure approval workflow** UI in frontend
6. **Load test** with realistic lead volumes

