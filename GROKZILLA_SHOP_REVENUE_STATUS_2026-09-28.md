# grokzilla.shop status + x402 revenue — 2026-09-28

Measured only. Unpaid 402s and master-token 200s are not USDC.

## Live status

Shop and alias both 200. x402 + Stripe on, free_beta off, Base mainnet USDC.
pay_to `0xDa1Eab46918882f8656a41cF9fCa80e2415369d1`.
12 native skills in health. AEO files live. Version agents.json 2.8.0.

## Revenue

x402-list volume $0.00 / 0 buyers / 0 settlements all-time.
CDP merchant_total=0. CDP search grokzilla=0.
Admin /api/admin/revenue and /transactions return 401 without ADMIN_API_KEY.
Connected Coinbase Default USDC = $0.00.
payTo ETH = 0. payTo USDC holding = $0.019 (19000 atomic) — not a counted facilitator settlement.

Exact measured x402 settlement volume: $0.00.

## Probe 2026-09-28T14:09:27Z

12/14 natives return 402. whitepages=500, shodan=500 on populated bodies (422 on empty).
token-count amount=4000 ($0.004) is first-settle candidate.
bazaar extension present; examples still `{ok:true}`.

## Directory

x402-list #91/325 Data, score 86, payment-ready until 2026-10-05T14:05:10Z, 11 endpoints, verified false.
Missing harvest path: POST /api/skills/nicje.
Do not add whitepages/shodan until they 402.

## Blockers

1. No CDP facilitator settle → Bazaar empty.
2. No USDC in connected Coinbase to self-seed.
3. Admin key missing in this session.
4. bazaar body placeholder `{ok:true}` on live 402s.
5. Broken reserved routes.
6. payment-ready expires 2026-10-05.
