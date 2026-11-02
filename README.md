# Cognita — Audit the Thinking, Not the Answer

**Cognita** is a live web platform that shifts evaluation from grading final answers to auditing the reasoning behind them. Educators and research reviewers paste a submission — an essay, research rationale, or reasoning log — and Cognita maps *how* the author thought rather than *what* they concluded.

> Built for the challenge: **AI Systems for Reviewers** — AI systems that empower educators and research reviewers to evaluate the depth of human cognition.

## What Cognita produces

A single run generates four artifacts:

1. **Cognitive depth score (0–100)** — an aggregate of six dimensions, adjustable by the reviewer.
2. **Reasoning chain** — a step-by-step map of the argument, with each step typed as a *claim*, *evidence*, *inference*, *assumption*, or *conclusion*, and marked *strong*, *weak*, or *unsupported*.
3. **Six dimension scores with quoted evidence** — Problem Framing, Evidence Use, Synthesis, Counter-argument, Methodology, and Metacognition. Every score cites a verbatim quote from the submission.
4. **Gaps & viva questions** — what the submission leaves unaddressed, and questions a reviewer can ask the author.

## Human-in-the-loop by design

- Every dimension score has a **slider the reviewer can override** — the AI's score is struck through, the reviewer's score becomes final.
- A **reviewer sign-off** is required before any result counts: the reviewer writes their judgement and rationale and signs the audit. AI output is advisory only; no result is final without human sign-off.
- The AI reports its **own confidence level** and lowers it when evidence is thin.

## Privacy & fairness

- **PII redaction before AI processing** — emails, phone numbers, and student IDs are replaced with `[EMAIL]`, `[PHONE]`, `[ID]` placeholders server-side. The redacted text is all the model ever sees.
- **Nothing is stored** — submissions are processed in memory and never persisted to a database.
- **No demographic inference** — the system prompt forbids inferring identity, gender, ethnicity, nationality, or native language, and forbids penalizing grammar, dialect, or writing style. Reasoning substance is the only criterion.
- See `Cognita_Governance.pdf` for the full governance document (prompts, guardrails, human-in-the-loop controls, PII handling, and bias mitigation).

## Getting started

**Live demo:** [https://cognitaudit.lovable.app](https://cognitaudit.lovable.app)

1. *(Optional)* Add assignment context, e.g. *"Undergraduate philosophy essay: Should predictive AI be used in university admissions?"*
2. Paste the submission (min. 80 characters) or click **Load sample**.
3. Click **Run reasoning audit**.
4. Review the chain and dimensions, **adjust any score**, and **approve & sign** the audit.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19 + TanStack Start (SSR), Tailwind CSS v4 |
| Server logic | TanStack server functions (edge runtime) |
| AI | Lovable AI Gateway (OpenAI reasoning model, JSON-structured output) |
| Design | Editorial serif/mono type system, grain texture, single-page layout |

## Governance summary

| Area | Control |
| --- | --- |
| Prompts | Fixed system prompt; no answer grading or pass/fail judgments |
| Guardrails | Input validation (80–12,000 chars), JSON-only output schema, structured error handling |
| Human-in-the-loop | Score overrides + mandatory reviewer sign-off |
| PII | Server-side redaction before the model call; nothing stored |
| Bias | No demographic inference; no style/grammar penalties; evidence-required scoring |
