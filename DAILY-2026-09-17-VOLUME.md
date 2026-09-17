# Daily volume playbook — 2026-09-17

Focus is **measured USDC**, not 402 count.

## Facts this morning

- 14/14 natives 402 correctly.
- payTo `0xDa1Eab46918882f8656a41cF9fCa80e2415369d1` has **0 Base txs** and **0 USDC**.
- CDP merchant_total **0**. Bazaar will not surface us until one mainnet settle.
- x402-list monitors **4/14** paths. payment-ready until **2026-09-24**.
- Admin revenue/transactions **401**.

## Highest-leverage actions, ranked

1. One $0.004 settle on `POST https://grokzilla.shop/api/skills/token-count` through the CDP facilitator. That is the Bazaar index key.
2. x402-list update: add the other 10 native paths. Proof file `/.well-known/x402list.txt`.
3. Merge slugify + uuid-batch + hash-digest + json-pointer onto shop natives at $0.002–$0.004.
4. Unlock `/api/admin/revenue` with a known `ADMIN_API_KEY` on Vercel project `ai-micro-pay` Production.
5. Keep partner 50% listings, but do not expect them to index our payTo.
