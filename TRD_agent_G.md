# Technical Requirements Document (TRD) - agent_G Version
## Test Series Portal — AI-Powered Selection Engine

**Version:** 1.0 (agent_G Edition)  
**Date:** 2026-05-05  
**Status:** Draft - Visionary

---

## 1. Architecture Overview: The Hybrid Ecosystem

Agent_G's version uses a **Hybrid Infrastructure** to optimize for both real-time user experience and heavy-duty AI processing.

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                           │
│   Next.js 14 + Tailwind + Recharts (Selection Dial)          │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                       API LAYER                              │
│   Next.js API Routes (tRPC for strict type safety)           │
└────────┬────────────────┬──────────────────┬────────────────┘
         │                │                  │
┌────────▼──────┐ ┌───────▼──────┐ ┌─────────▼───────┐
│  SUPABASE     │ │  RAILWAY     │ │  HUGGINGFACE    │
│  (Data/Auth)  │ │  (Heavy Ops) │ │  (NLP SOTA)     │
│  - User Data  │ │  - PDF Gen   │ │  - Auto-Tagging │
│  - Realtime   │ │  - FSRS Eng  │ │  - Semantic Srch│
│  - pgvector   │ │  - Agents    │ │  - Quality Chks │
└────────────────┘ └──────────────┘ └─────────────────┘
```

---

## 2. Technical Stack Enhancements

| Component | Choice | Reason |
|---|---|---|
| **Spaced Repetition** | **FSRS** | SOTA algorithm for memory optimization. |
| **Microservices** | **Railway** | Handles long-running Python/Node jobs (PDF/LaTeX, heavy agents). |
| **NLP Services** | **HuggingFace Inference API** | Offloads semantic tagging and similarity checks to specialized models. |
| **AI Vision** | **Claude 3.5 Sonnet** | Best-in-class for OCR of complex exam papers/equations. |
| **Vector Store** | **pgvector (Supabase)** | Native PostgreSQL vector support for similarity search. |

---

## 3. Database Schema Updates (agent_G specific)

### 3.1 `fsrs_cards` (New Table)
Stores the state of every concept for every user for the FSRS algorithm.
```sql
id              uuid PRIMARY KEY
user_id         uuid REFERENCES auth.users(id)
concept_id      uuid -- link to concept cluster
stability       float -- FSRS parameter
difficulty      float -- FSRS parameter
elapsed_days    int
scheduled_days  int
reps            int
lapses          int
state           int -- New, Learning, Review, Relearning
last_review     timestamptz
```

### 3.2 `test_attempts` (Enhanced)
```sql
ALTER TABLE test_attempts ADD COLUMN confidence text CHECK(confidence IN ('sure', 'unsure', 'guessed'));
ALTER TABLE test_attempts ADD COLUMN time_to_first_answer_ms int;
ALTER TABLE test_attempts ADD COLUMN metadata jsonb; -- For metacognitive reflection logs
```

### 3.3 `exam_manifests` (New Table)
Stores the "Zero-Code" configuration.
```sql
id              uuid PRIMARY KEY
slug            text UNIQUE
manifest        jsonb -- { syllabus: [], weights: {}, marking: {}, ai_persona: {} }
version         int
is_active       bool
```

---

## 4. AI Pipeline 2.0: Adversarial Question Gen

**Trigger:** `POST /api/admin/questions/generate`

1.  **Context Fetch:** Retrieve `Concept Cluster` and `Common Misconceptions` for the topic.
2.  **Generation (Sonnet):**
    -   Generate question text and correct answer.
    -   **Distractor Analysis:** Specifically generate 3 distractors that mirror common errors (e.g., confusing "Money Bill" with "Financial Bill").
3.  **Verification (Haiku):** Second model plays the "Student" and attempts the question. If it gets it wrong (unexpectedly) or flags ambiguity, the question is discarded.
4.  **Vectorization (OpenAI/HuggingFace):** Generate embedding and check cosine similarity (< 0.92) to prevent near-duplicates.

---

## 5. Selection Analytics Engine

**PoS Calculation (Railway Service):**
-   Runs daily via cron or after major mocks.
-   **Inputs:** 
    -   Mean Mastery across weighted topics.
    -   Consistency (Standard Deviation of scores).
    -   Speed (Time per question vs. benchmark).
    -   Historical cut-off data stored in `exam_manifests`.
-   **Output:** Percentile estimate and "Probability of Selection" percentage.

---

## 6. Implementation Milestones

### Milestone 1: The Core Engine (Week 1-2)
- Supabase Setup + Auth.
- Exam Manifest Engine (Zero-Code loading).
- Basic Test Engine with Confidence Marking.

### Milestone 2: AI & Analytics (Week 3-4)
- Adversarial Q-Gen Pipeline.
- FSRS Implementation for Retest Queue.
- First-pass PoS algorithm.

### Milestone 3: Scale & Polish (Week 5-6)
- Railway microservices for PDF and LaTeX.
- HuggingFace auto-tagging.
- Mobile-responsive UI with the "Selection Dial."

---

**End of agent_G TRD.**
