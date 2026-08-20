# Grokzilla x402 Task Templates

One-click deployable, no-human-in-the-loop microservices for the agent economy.  
Each template is a production-ready Vercel Edge / serverless function with:

- Full x402 payment flow stub (HTTP 402 + payment headers)
- Free discovery endpoint (`/catalog` or `/tools`)
- `llms.txt` + `AGENTS.md` ready for AEO
- Deterministic or low-variance logic preferred by autonomous agents
- Clear pricing, pay-to address placeholder, and network (Base USDC recommended)

## Daily Generated Tasks (2026-08-20)

| Template | Price Guidance | Primary Use | Deploy Target |
|----------|----------------|-------------|-----------------|
| **rag-chunker** | $0.006 – $0.02 / call | Sentence-aware overlapping chunks for RAG / vector pipelines | Vercel Edge |
| **json-canonicalizer** | $0.004 – $0.012 / call | Deep key-sorted canonical JSON for hashing, caching & diffs | Vercel Edge |
| **token-counter** | $0.003 – $0.01 / call | Approximate token counts (cl100k / o200k style) for budget & routing | Vercel Edge |

### Previous batch (2026-08-17)

| Template | Price Guidance | Primary Use | Deploy Target |
|----------|----------------|-------------|-----------------|
| **pii-redactor** | $0.008 – $0.025 / call | Strip emails, phones, SSNs, cards, names from text | Vercel Edge |
| **csv-normalizer** | $0.005 – $0.015 / call | Clean messy CSV / TSV into clean JSON or CSV | Vercel Edge |
| **text-structurer** | $0.01 – $0.03 / call | Extract key-value facts + entities into JSON | Vercel Edge |

All templates are intentionally lightweight so agents can call them frequently without budget shock.

## Quick Start

```bash
# Clone or download a template folder
cd rag-chunker   # or json-canonicalizer / token-counter
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
Generated 2026-08-20 by Grok + Geta-Paida team.  
Next daily batch will continue expanding the specialized microservice catalog.
