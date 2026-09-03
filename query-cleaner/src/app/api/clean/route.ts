import { NextRequest, NextResponse } from "next/server";

/**
 * x402 Query Cleaner – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.01 USDC per call
 *
 * Accepts: { "url": string, "stripTracking": boolean, "sort": boolean, "keep": string[] }
 * Returns: { "success": true, "result": { original, cleaned, params, removed }, "meta": {...} }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "7000"; // ~0.007 USDC

const TRACKING_PREFIXES = [
  "utm_",
  "fbclid",
  "gclid",
  "gclsrc",
  "dclid",
  "msclkid",
  "mc_",
  "mkt_",
  "trk_",
  "ref_",
  "source",
  "campaign",
  "medium",
  "content",
  "term",
  "yclid",
  "twclid",
  "igshid",
  "si",
  "_ga",
  "_gl",
  "spm",
  "scm",
];

function hasValidPayment(req: NextRequest): boolean {
  // STUB: replace with real x402 / facilitator verification in production
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function isTrackingKey(key: string, keep: Set<string>): boolean {
  if (keep.has(key.toLowerCase())) return false;
  const lower = key.toLowerCase();
  return TRACKING_PREFIXES.some(
    (p) => lower === p || lower.startsWith(p) || lower.includes(p)
  );
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Query-string / URL cleaner – strip tracking params, canonicalize (deterministic)",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-query-cleaner", version: "1.0.0" },
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
    const input = String(body.url || body.query || body.href || "").trim();
    if (!input) {
      return NextResponse.json({ error: "Missing 'url' or 'query' field" }, { status: 400 });
    }
    if (input.length > 20_000) {
      return NextResponse.json({ error: "Input too large (max 20k chars)" }, { status: 413 });
    }

    const stripTracking = body.stripTracking !== false;
    const sortKeys = body.sort !== false;
    const keep = new Set(
      (Array.isArray(body.keep) ? body.keep : []).map((k: any) => String(k).toLowerCase())
    );

    let base = "";
    let search = "";
    try {
      if (input.startsWith("http://") || input.startsWith("https://") || input.startsWith("//")) {
        const u = new URL(input.startsWith("//") ? "https:" + input : input);
        base = u.origin + u.pathname;
        search = u.search.startsWith("?") ? u.search.slice(1) : u.search;
      } else if (input.startsWith("?")) {
        search = input.slice(1);
      } else {
        search = input;
      }
    } catch {
      search = input.startsWith("?") ? input.slice(1) : input;
    }

    const params = new URLSearchParams(search);
    const originalParams: Record<string, string[]> = {};
    const cleanedParams: Record<string, string[]> = {};
    const removed: string[] = [];

    for (const [key, value] of params.entries()) {
      if (!originalParams[key]) originalParams[key] = [];
      originalParams[key].push(value);

      if (stripTracking && isTrackingKey(key, keep)) {
        removed.push(key);
        continue;
      }
      if (!cleanedParams[key]) cleanedParams[key] = [];
      cleanedParams[key].push(value);
    }

    const keys = Object.keys(cleanedParams);
    if (sortKeys) keys.sort();

    const cleanedSearch = keys
      .map((k) =>
        cleanedParams[k]
          .map((v) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join("&")
      )
      .join("&");

    const cleanedUrl = base
      ? cleanedSearch
        ? `${base}?${cleanedSearch}`
        : base
      : cleanedSearch
      ? `?${cleanedSearch}`
      : "";

    return NextResponse.json({
      success: true,
      result: {
        original: input,
        cleaned: cleanedUrl,
        base: base || null,
        params: cleanedParams,
        removed: [...new Set(removed)],
        query: cleanedSearch,
      },
      meta: {
        stripTracking,
        sorted: sortKeys,
        originalParamCount: Object.keys(originalParams).length,
        cleanedParamCount: keys.length,
        removedCount: new Set(removed).size,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body or unparseable URL" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-query-cleaner",
    description: "Parse, strip tracking params and canonicalize query strings / URLs. Agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/clean" },
  });
}
