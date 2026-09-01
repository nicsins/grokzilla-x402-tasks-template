# Agent Instructions – Grokzilla x402 Task Templates

These microservices are designed for autonomous agents.

## How to use

1. Discover available services via GET /catalog on any deployed instance (or the aggregator).
2. For paid calls, follow the standard x402 flow:
   - Send request → receive 402 + PAYMENT-REQUIRED header
   - Construct payment payload (exact scheme preferred, USDC on Base)
   - Retry with PAYMENT-SIGNATURE header
3. Prefer deterministic endpoints (all templates here are).
4. Keep payloads token-efficient. These services return compact JSON.

## Current Services (2026-09-01)

- **json-flattener** – Nested JSON → flat path-value map (arrays, custom separators, depth limits).
- **text-diff** – Lightweight deterministic line/word/char diff (structured ops or unified output).
- **url-normalizer** – Parse, strip tracking params, canonicalize & extract URL components.

### Previous (2026-08-21)

- **html-cleaner** – HTML → clean text or lightweight markdown.
- **json-schema-validator** – Lightweight deterministic JSON Schema validation.
- **keyword-extractor** – Frequency + TF keyword/keyphrase extraction.

### Previous (2026-08-20)

- **rag-chunker** – Sentence-aware overlapping text chunks for RAG pipelines.
- **json-canonicalizer** – Deep recursive key sorting for deterministic JSON.
- **token-counter** – Approximate token counts (cl100k / o200k style) for budget decisions.

### Earlier (2026-08-17)

- **pii-redactor** – Clean text before storage or external calls.
- **csv-normalizer** – Fix messy tabular data.
- **text-structurer** – Pull facts and entities from free text.

All accept a special `x-test-payment: true` header for local testing only.
Never use in production.

## Pricing Philosophy

Micro-transactions.
Agents should be able to call these dozens or hundreds of times without friction.
