# Grokzilla x402 Task Templates

One-click deployable, no-human-in-the-loop microservices for the agent economy.  
Each template is a production-ready Vercel Edge / serverless function with:

- Full x402 payment flow stub (HTTP 402 + payment headers)
- Free discovery endpoint (`/catalog` or `/tools`)
- `llms.txt` + `AGENTS.md` ready for AEO
- Deterministic or low-variance logic preferred by autonomous agents
- Clear pricing, pay-to address placeholder, and network (Base USDC recommended)

## Daily Generated Tasks (2026-09-04)

| Template | Price Guidance | Primary Use | Deploy Target |
|----------|----------------|-------------|-----------------|
| **base64-toolkit** | $0.003 – $0.008 / call | Encode / decode Base64 (standard + URL-safe) | Vercel Edge |
| **html-entity-codec** | $0.003 – $0.008 / call | Encode / decode HTML entities (named + numeric) | Vercel Edge |
| **duration-parser** | $0.003 – $0.009 / call | Parse human durations (2h30m, 1d4h) → seconds/ISO + humanize | Vercel Edge |

### Previous (2026-09-03)

| Template | Price Guidance | Primary Use | Deploy Target |
|----------|----------------|-------------|-----------------|
| **uuid-toolkit** | $0.003 – $0.009 / call | Generate / validate / parse UUIDs (v4, v7, nil, max) | Vercel Edge |
| **string-similarity** | $0.004 – $0.012 / call | Levenshtein ratio, Jaccard, Dice coefficient scoring | Vercel Edge |
| **query-cleaner** | $0.003 – $0.01 / call | Strip tracking params, canonicalize query strings / URLs | Vercel Edge |

### Previous (2026-09-02)

| Template | Price Guidance | Primary Use | Deploy Target |
|----------|----------------|-------------|-----------------|
| **case-converter** | $0.003 – $0.009 / call | Text → snake/camel/kebab/pascal/constant/title/lower/upper | Vercel Edge |
| **hash-generator** | $0.003 – $0.008 / call | SHA-256 / SHA-1 / MD5 / SHA-512 of text or JSON | Vercel Edge |
| **markdown-to-text** | $0.004 – $0.012 / call | Markdown → clean plain text (deterministic strip) | Vercel Edge |

### Previous (2026-09-01 extended)

| Template | Price Guidance | Primary Use | Deploy Target |
|----------|----------------|-------------|-----------------|
| **slug-generator** | $0.003 – $0.01 / call | Text → clean URL/SEO slug (custom sep, length, strict) | Vercel Edge |
| **json-path-extractor** | $0.004 – $0.012 / call | Extract values from nested JSON by dotted / array paths | Vercel Edge |
| **date-normalizer** | $0.003 – $0.009 / call | Loose dates & timestamps → ISO-8601 / unix | Vercel Edge |

### Earlier (2026-09-01)

| Template | Price Guidance | Primary Use | Deploy Target |
|----------|----------------|-------------|-----------------|
| **json-flattener** | $0.004 – $0.012 / call | Nested JSON → flat path-value map (arrays, custom sep, depth limit) | Vercel Edge |
| **text-diff** | $0.005 – $0.015 / call | Lightweight line/word/char diff (structured ops or unified) | Vercel Edge |
| **url-normalizer** | $0.003 – $0.01 / call | Parse, strip tracking params, canonicalize & extract URL components | Vercel Edge |

### Previous batch (2026-08-21)

| Template | Price Guidance | Primary Use | Deploy Target |
|----------|----------------|-------------|-----------------|
| **html-cleaner** | $0.005 – $0.015 / call | HTML → clean text or lightweight markdown (strip scripts/styles/noise) | Vercel Edge |
| **json-schema-validator** | $0.004 – $0.012 / call | Lightweight deterministic JSON Schema validation for agent contracts | Vercel Edge |
| **keyword-extractor** | $0.005 – $0.018 / call | Frequency + TF keyword/keyphrase extraction for RAG, tagging & routing | Vercel Edge |

### Previous batch (2026-08-20)

| Template | Price Guidance | Primary Use | Deploy Target |
|----------|----------------|-------------|-----------------|
| **rag-chunker** | $0.006 – $0.02 / call | Sentence-aware overlapping chunks for RAG / vector pipelines | Vercel Edge |
| **json-canonicalizer** | $0.004 – $0.012 / call | Deep key-sorted canonical JSON for hashing, caching & diffs | Vercel Edge |
| **token-counter** | $0.003 – $0.01 / call | Approximate token counts (cl100k / o200k style) for budget & routing | Vercel Edge |

### Earlier (2026-08-17)

| Template | Price Guidance | Primary Use | Deploy Target |
|----------|----------------|-------------|-----------------|
| **pii-redactor** | $0.008 – $0.025 / call | Strip emails, phones, SSNs, cards, names from text | Vercel Edge |
| **csv-normalizer** | $0.005 – $0.015 / call | Clean messy CSV / TSV into clean JSON or CSV | Vercel Edge |
| **text-structurer** | $0.01 – $0.03 / call | Extract key-value facts + entities into JSON | Vercel Edge |

All templates are intentionally lightweight so agents can call them frequently without budget shock.

## Quick Start

```bash
# Clone or download a template folder
cd base64-toolkit   # or duration-parser / html-entity-codec / uuid-toolkit ...
npm install
# Set env: PAY_TO_ADDRESS, FACILITATOR_URL (optional), NETWORK=base
vercel deploy --prod
```

After deploy:

1. Update the pay-to address and price in the route handler.
2. Add the live URL to your `/catalog` aggregator or list on x402 Bazaar / Agent Bazaar.
3. Point `llms.txt` and `AGENTS.md` at the new endpoint.

## x402 Integration Stub (shared pattern)

Every service uses the same lightweight pattern:

```ts
// inside the route handler
if (!hasValidPayment(req)) {
  return new Response(JSON.stringify({
    error: "Payment Required",
    accepts: [{
      scheme: "exact",
      network: "base",
      maxAmountRequired: "10000", // 0.01 USDC in atomic units
      resource: req.url,
      description: "...",
      mimeType: "application/json",
      payTo: process.env.PAY_TO_ADDRESS,
    }]
  }), {
    status: 402,
    headers: {
      "PAYMENT-REQUIRED": btoa(JSON.stringify(paymentRequirements)),
      "Content-Type": "application/json"
    }
  });
}
// verify PAYMENT-SIGNATURE header → settle → process
```

Use official packages when available (`x402-hono`, `@x402/fetch`, Coinbase CDP facilitators, etc.).

## No-Human-in-Loop Guarantee

- Zero human approval steps
- Fully autonomous payment + execution
- Stateless or short-lived state only
- Designed for high-frequency agent-to-agent calls

## License & Contribution

MIT. Built for the Grokzilla / Dragonscale agent economy.  
Daily variants are pushed here and mirrored to Google Drive for offline use.

---
Generated / extended 2026-09-04 by Grok + Geta-Paida team.  
Next daily batch will continue expanding the specialized microservice catalog.
