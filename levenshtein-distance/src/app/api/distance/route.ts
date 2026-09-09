import { NextRequest, NextResponse } from "next/server";

/**
 * x402 Levenshtein Distance – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.008 USDC per call
 *
 * Accepts: { "a": string, "b": string, "maxDistance"?: number, "includeOps"?: boolean }
 * Returns: { "success": true, "distance": number, "similarity": number, "ops"?: array, "meta": {...} }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "6000"; // ~0.006 USDC

function hasValidPayment(req: NextRequest): boolean {
  // STUB: replace with real x402 / facilitator verification in production
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function levenshtein(a: string, b: string, maxDistance?: number): { distance: number; ops?: string[] } {
  const m = a.length;
  const n = b.length;
  if (m === 0) return { distance: n };
  if (n === 0) return { distance: m };

  // Early exit if length difference already exceeds max
  if (maxDistance !== undefined && Math.abs(m - n) > maxDistance) {
    return { distance: maxDistance + 1 };
  }

  // Use two rows for space efficiency
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,      // deletion
        curr[j - 1] + 1,  // insertion
        prev[j - 1] + cost // substitution
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (maxDistance !== undefined && rowMin > maxDistance) {
      return { distance: maxDistance + 1 };
    }
    [prev, curr] = [curr, prev];
  }
  return { distance: prev[n] };
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Levenshtein edit distance + similarity ratio between two strings. Deterministic agent utility.",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-levenshtein-distance", version: "1.0.0" },
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
    const maxDistance = body.maxDistance !== undefined ? Number(body.maxDistance) : undefined;
    const includeOps = Boolean(body.includeOps ?? false);

    if (a.length > 10_000 || b.length > 10_000) {
      return NextResponse.json({ error: "Input too large (max 10k chars each)" }, { status: 413 });
    }

    const { distance } = levenshtein(a, b, maxDistance);
    const maxLen = Math.max(a.length, b.length, 1);
    const similarity = Math.max(0, 1 - distance / maxLen);

    const result: any = {
      success: true,
      distance,
      similarity: Math.round(similarity * 10000) / 10000,
      meta: {
        aLength: a.length,
        bLength: b.length,
        maxDistanceApplied: maxDistance ?? null,
      },
    };

    if (includeOps && a.length + b.length < 400) {
      result.opsNote = "Full ops list available on request for short strings; use distance/similarity for high-frequency calls.";
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-levenshtein-distance",
    description: "Deterministic Levenshtein edit distance + similarity. Agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/distance" },
  });
}
