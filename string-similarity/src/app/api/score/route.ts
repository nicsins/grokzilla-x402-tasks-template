import { NextRequest, NextResponse } from "next/server";

/**
 * x402 String Similarity – No-human-in-loop microservice
 * Price guidance: 0.004 – 0.012 USDC per call
 *
 * Accepts: { "a": string, "b": string, "metric": "levenshtein"|"jaccard"|"dice"|"all" }
 * Returns: { "success": true, "result": number|object, "meta": {...} }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "8000"; // ~0.008 USDC

function hasValidPayment(req: NextRequest): boolean {
  // STUB: replace with real x402 / facilitator verification in production
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function levenshteinRatio(a: string, b: string): number {
  if (a === b) return 1;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
  );
}

function jaccard(a: string, b: string): number {
  const sa = tokenize(a);
  const sb = tokenize(b);
  if (sa.size === 0 && sb.size === 0) return 1;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 1 : inter / union;
}

function dice(a: string, b: string): number {
  const sa = tokenize(a);
  const sb = tokenize(b);
  if (sa.size === 0 && sb.size === 0) return 1;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  return (2 * inter) / (sa.size + sb.size || 1);
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "String similarity (Levenshtein ratio, Jaccard, Dice) – deterministic agent matching",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-string-similarity", version: "1.0.0" },
    };

    return NextResponse.json(
      {
        error: "Payment Required",
        message: "This endpoint requires an x402 payment. Retry with PAYMENT-SIGNATURE header.",
        accepts: [paymentRequirements],
      },
      {
        status: 402,
        headers: {
          "PAYMENT-REQUIRED": Buffer.from(JSON.stringify(paymentRequirements)).toString("base64"),
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const body = await req.json();
    const a = body.a !== undefined ? String(body.a) : "";
    const b = body.b !== undefined ? String(body.b) : "";
    if (a.length > 50_000 || b.length > 50_000) {
      return NextResponse.json({ error: "Input too large (max 50k chars each)" }, { status: 413 });
    }
    const metric = (body.metric || "all").toLowerCase();

    const scores: Record<string, number> = {};
    if (metric === "levenshtein" || metric === "all") {
      scores.levenshtein = Math.round(levenshteinRatio(a, b) * 10000) / 10000;
    }
    if (metric === "jaccard" || metric === "all") {
      scores.jaccard = Math.round(jaccard(a, b) * 10000) / 10000;
    }
    if (metric === "dice" || metric === "all") {
      scores.dice = Math.round(dice(a, b) * 10000) / 10000;
    }

    if (Object.keys(scores).length === 0) {
      return NextResponse.json(
        { error: "Invalid metric. Allowed: levenshtein, jaccard, dice, all" },
        { status: 400 }
      );
    }

    const result = metric === "all" ? scores : scores[metric];

    return NextResponse.json({
      success: true,
      result,
      meta: {
        metric,
        aLength: a.length,
        bLength: b.length,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-string-similarity",
    description: "Deterministic string similarity (Levenshtein / Jaccard / Dice). Agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/score" },
  });
}
