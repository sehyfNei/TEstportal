# agent_G Review & Brainstorming Notes
## Test Series Portal - Visionary & Technical Additions

**Reviewer:** agent_G  
**Date:** 2026-05-05  
**Context:** Review of `PRD.md`, `TRD.md`, and `agent_CT.md`.  
**Stance:** Innovation-focused and Ecosystem-driven. Aiming to elevate the portal from a "test-taker" to a "selection-engine."

---

## 1. Vision & Strategy

The current documentation is excellent. Agent_CC provided the structure, and Agent_CT provided the pedagogical "sanity checks." My role is to push the **State of the Art (SOTA)** and ensure the **Ecosystem Integration** (Supabase/HuggingFace/Railway) is utilized to its full potential for a truly modular, AI-first experience.

---

## 2. Advanced Learning Science & Adaptive Engine

### 2.1 Beyond Spaced Repetition: FSRS Integration
While Agent_CT mentioned SM-2, the current SOTA in spaced repetition is **FSRS (Free Spaced Repetition Scheduler)**.
- **Proposal:** Use FSRS to power the `Retest Queue`. It's more efficient than SM-2 at predicting the "probability of recall" and can be tuned per-user based on their unique learning speed.
- **Technical implementation:** Implement the FSRS algorithm as a small TypeScript utility in the `lib/adaptive` folder.

### 2.2 Cognitive Load Management (The "Flow" Score)
Testing is stressful. If a test is too hard, users get discouraged; too easy, they get bored.
- **Feature:** **Dynamic "Flow" Adjuster.** During a practice/topic test, if a user gets 3 questions wrong in a row (Conceptual Gap), the next question should be a "Confidence Builder" (Medium-Easy) to keep them in the flow state.
- **Metric:** Track "Time to First Answer" as a proxy for cognitive load. High latency on easy questions = user fatigue. Suggest a break.

### 2.3 Metacognitive Reflection Bridge
Don't just show the answer.
- **Workflow:** When a user submits a question they marked as "Unsure" (Agent_CT's idea), show a **"Before you see the answer..."** prompt:
  - *"You were unsure here. Which of these two options was your second choice?"*
  - This data is gold for AI to analyze *why* the user was confused between two specific distractors.

---

## 3. AI-Generated Content (AIGC) Strategy 2.0

### 3.1 "Adversarial" Distractor Generation
MCQs are only as good as their "wrong" options (distractors).
- **Proposal:** Use LLMs not just to generate questions, but to **specifically generate distractors based on common misconceptions.**
- **Prompting:** *"Generate 3 distractors for this UPSC Polity question that a student who confuses 'Money Bill' with 'Financial Bill' would likely pick."*

### 3.2 Automated Tagging & Cross-Linking (HuggingFace)
- **Ecosystem Use:** Use a specialized NLP model (hosted on **HuggingFace Inference API** or **Railway**) to auto-tag manual uploads.
- **Semantic Cross-Linking:** If a user fails a question on "Article 21," the AI should not just say "Study Article 21," but link to a **"Concept Cluster"**—e.g., *"This is often tested alongside Article 19 (Freedom of Speech) and the Kesavananda Bharati Case. View cluster."*

### 3.3 Multimodal Question Ingestion
- **Vision AI:** Use Claude 3.5 Sonnet's vision capabilities to ingest PYQs from handwritten notes or old printed books (image-to-JSON). This accelerates the "seeding" of the question bank.

---

## 4. Technical Ecosystem & Modularity

### 4.1 The "Exam Template Store"
To be truly modular, we need a standard "Exam Manifest."
- **Proposal:** Create a GitHub-based or DB-based **Template Store**.
  - A JSON manifest that defines the syllabus, weights, marking scheme, and "Recommended AI Persona" (e.g., a "Strict UPSC Moderator" persona vs. a "Helpful SAT Tutor" persona).
- **Deployment:** A new institute can "fork" an exam template, add their 10% custom questions, and go live in minutes.

### 4.2 Hybrid Infrastructure (Railway + Supabase)
- **Supabase:** Handling Auth, DB, and Realtime.
- **Railway:** Handling the "Heavy Lifting" Python services:
  - **Vector Embedding Workers:** Bulk embedding of questions.
  - **PDF Generation:** Creating high-quality offline test papers with LaTeX.
  - **AI Agent Orchestrator:** LangGraph/CrewAI for multi-step question verification.

---

## 5. The "Predictive Score" & Selection Analytics

### 5.1 The "Probability of Selection" (PoS)
This is the ultimate metric for a "Test Series Portal."
- **Concept:** Based on:
  1. Current Mastery Score.
  2. Historical cut-offs for the target exam.
  3. Peer comparison (Phase 1.5).
  4. Accuracy trend.
- **Feature:** A dashboard dial showing **"Your estimated score if the exam was today: 105/200 (Cut-off: 98)."** This provides immense motivation.

### 5.2 "Shadowing" & Peer Insights (Lightweight)
Even without a forum (Phase 1), we can show:
- *"72% of users who got this wrong also picked Option B."*
- *"Top 10% of users spent an average of 45s on this question."*
- This creates a sense of competition/community without the overhead of moderation.

---

## 6. Additional Requirements for Agent_G

### Product Requirements

| ID | Requirement | Priority |
|---|---|---|
| G-PRD-01 | FSRS-based scheduling for the Retest Queue. | P0 |
| G-PRD-02 | "Metacognitive Prompt" for questions marked as 'Unsure' or 'Guessed'. | P1 |
| G-PRD-03 | Predictive Score (PoS) based on mastery and historical cut-offs. | P1 |
| G-PRD-04 | "Concept Clusters" linking related subtopics for holistic review. | P1 |
| G-PRD-05 | Peer performance benchmarks (time/option distribution) shown in analysis. | P1 |
| G-PRD-06 | Admin can "Import Exam Template" from a JSON manifest. | P0 |

### Technical Requirements

| ID | Requirement | Priority |
|---|---|---|
| G-TRD-01 | Integrate HuggingFace Inference API for auto-tagging and semantic search. | P1 |
| G-TRD-02 | Setup Railway microservice for PDF/LaTeX generation of test papers. | P2 |
| G-TRD-03 | Implement FSRS algorithm in the `lib/adaptive` module. | P0 |
| G-TRD-04 | Use Claude Vision for bulk ingestion of image-based question banks. | P1 |
| G-TRD-05 | Implement Distractor Analysis prompting in the AI Question Gen pipeline. | P1 |
| G-TRD-06 | Standardize the "Exam Manifest" schema for zero-code portability. | P0 |

---

## 7. Next Steps for Collaborative Finalization

1.  **Unified PRD/TRD:** Merge `agent_CC`'s structure with `agent_CT`'s pedagogical rigor and `agent_G`'s ecosystem/SOTA ideas.
2.  **Database Schema Update:** Ensure `pgvector`, `FSRS parameters`, `Confidence levels`, and `Concept Clusters` are supported.
3.  **UI/UX Prototyping:** Focus on the "Test Taking" interface first, as it's the primary data source.
4.  **Seeding:** Pick one exam (e.g., UPSC Prelims) and use the Vision + AI pipeline to seed 1,000 high-quality questions.

---

**End of agent_G notes.**
