# Product Requirements Document (PRD) - agent_G Version
## Test Series Portal — AI-Powered Selection Engine

**Version:** 1.0 (agent_G Edition)  
**Date:** 2026-05-05  
**Status:** Draft - Visionary

---

## 1. Executive Summary

This is the **selection-engine** version of the test series portal. While traditional portals focus on content delivery, this version focuses on **outcome certainty**. By combining **FSRS (Free Spaced Repetition Scheduler)**, **Adversarial AI Question Generation**, and **Predictive Selection Analytics**, we create a platform that doesn't just help users study—it predicts and ensures their selection in competitive exams.

The platform is a modular, AI-first ecosystem that baseline users via a diagnostic test, manages their cognitive load through "Flow-based" testing, and provides a **Probability of Selection (PoS)** score.

---

## 2. Core Philosophy: The Selection Loop

1.  **Baseline:** Multi-dimensional diagnostic (Knowledge + Strategy + Confidence).
2.  **Personalize:** FSRS-driven improvement plan that optimizes for the "Probability of Recall."
3.  **Stress-Test:** Adversarial AI questions designed to target specific user misconceptions.
4.  **Reflect:** Metacognitive prompts that bridge the gap between "guessing" and "knowing."
5.  **Predict:** Real-time selection probability vs. historical cut-offs.

---

## 3. High-Level Requirements (agent_G Additions)

### 3.1 Advanced Learning Mechanics [P0]
- **FSRS Scheduler:** Instead of simple intervals, use the FSRS algorithm to schedule retests for weak concepts.
- **Confidence Marking:** Users must tag every answer as *Sure*, *Unsure*, or *Guessed*.
- **Metacognitive Reflection:** If a user gets an 'Unsure' question wrong, the AI asks: *"You were between A and B. What made you lean towards B?"*

### 3.2 Predictive Analytics (The "Selection Dial") [P1]
- **Probability of Selection (PoS):** A dashboard metric (0-100%) indicating the likelihood of clearing the target exam based on current mastery, historical data, and peer benchmarks.
- **Readiness Confidence:** A "data-quality" meter showing how reliable the readiness score is (e.g., "High Confidence" vs. "Need more data on Polity").

### 3.3 AIGC Strategy 2.0 [P0]
- **Adversarial Distractors:** AI generates "traps" based on common student errors found in the database.
- **Concept Clusters:** Questions are grouped into clusters (e.g., "Fundamental Rights + Judicial Review"). Failing one triggers a review of the cluster.
- **Vision Ingestion:** Admin can upload photos of PYQs from books; Claude Vision converts them to structured JSON.

### 3.4 The Exam Template Store [P0]
- **JSON Manifests:** All exam parameters (syllabus, weights, marking) are defined in a portable JSON format.
- **Zero-Code Exam Launch:** Importing a manifest instantly configures the entire portal for a new exam type (UPSC, SAT, JEE, etc.).

---

## 4. Functional Requirements

### 4.1 User Dashboard (agent_G Enhanced)
- **Selection Dial:** Visual representation of PoS.
- **Cognitive Load Warning:** Alert users when their "Time to First Answer" increases, suggesting a break to maintain peak performance.
*   **Mistake Notebook:** A dedicated space for "Unresolved Mistakes" that uses FSRS to resurface questions until mastery is confirmed.

### 4.2 Test Engine (agent_G Enhanced)
- **Flow Control:** If a user fails 3 consecutive questions in a topic, the engine inserts a "Confidence Builder" question to prevent frustration.
- **Strategy Metrics:** Track "Accuracy by Attempt Order" and "Time wasted on wrong answers."

### 4.3 Admin Panel (agent_G Enhanced)
- **AI Agent Orchestrator:** A multi-step pipeline for question generation:
    1.  Generate question text.
    2.  Generate adversarial distractors.
    3.  Verify accuracy via a second LLM.
    4.  Generate embedding for similarity check.

---

## 5. Success Metrics (agent_G KPIs)
- **Selection Correlation:** How accurately did the PoS predict actual exam results? (Target: >85% correlation).
- **Retention Efficiency:** Ratio of "Knowledge Retained" vs. "Time Spent" using FSRS vs. traditional methods.
- **AIGC Approval Rate:** % of AI questions approved by admins without edits (Target: >90%).

---

**End of agent_G PRD.**
