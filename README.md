# Grokzilla x402 Task Templates

One-click deployable, no-human-in-the-loop microservices for the agent economy.  
Each template is a production-ready Vercel Edge / serverless function with:

- Full x402 payment flow stub (HTTP 402 + payment headers)
- Free discovery endpoint (`/catalog` or `/tools`)
- `llms.txt` + `AGENTS.md` ready for AEO
- Deterministic or low-variance logic preferred by autonomous agents
- Clear pricing, pay-to address placeholder, and network (Base USDC recommended)

## Daily Generated Tasks (2026-09-08)

| Template | Price Guidance | Primary Use | Deploy Target |
|----------|----------------|-------------|-----------------|
| **haversine-distance** | $0.003 – $0.008 / call | Great-circle distance + bearing + midpoint | Vercel Edge |
| **iban-validator** | $0.003 – $0.009 / call | IBAN structure + MOD-97 checksum + normalize | Vercel Edge |
| **json-pointer** | $0.004 – $0.010 / call | RFC 6901 JSON Pointer get / set / remove | Vercel Edge |

### Previous (2026-09-07)

| Template | Price Guidance | Primary Use | Deploy Target |
|----------|----------------|-------------|-----------------|
| **semver-toolkit** | $0.003 – $0.008 / call | Parse / compare / bump / sort SemVer 2.0 | Vercel Edge |
| **text-metrics** | $0.003 – $0.007 / call | Counts + Shannon entropy + uniqueness for quality gating | Vercel Edge |
| **luhn-check** | $0.002 – $0.006 / call | Luhn validate + check-digit (cards, IMEI, IDs) | Vercel Edge |

### Previous (2026-09-04)

| Template | Price Guidance | Primary Use | Deploy Target |
|----------|----------------|-------------|-----------------|
| **base64-toolkit** | $0.003 – $0.008 / call | Encode / decode Base64 (standard + URL-safe) | Vercel Edge |
| **html-entity-codec** | $0.003 – $0.008 / call | Encode / decode HTML entities (named + numeric) | Vercel Edge |
| **duration-parser** | $0.003 – $0.009 / call | Parse human durations (2h30m, 1d4h) → seconds/ISO + humanize | Vercel Edge |

All templates are intentionally lightweight so agents can call them frequently without budget shock.

## Quick Start

```bash
# Clone or download a template folder
cd haversine-distance   # or iban-validator / json-pointer / ...
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
Generated / extended 2026-09-08 by Grok + Geta-Paida team.  
Next daily batch will continue expanding the specialized microservice catalog.
