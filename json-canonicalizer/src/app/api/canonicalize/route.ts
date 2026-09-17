import { NextRequest, NextResponse } from "next/server";

/**
 * x402 JSON Canonicalizer – No-human-in-loop microservice
 * Price guidance: 0.004 – 0.010 USDC per call
 *
 * Produces deterministic JCS-style (RFC 8785) output:
 * - object keys sorted lexicographically
 * - no insignificant whitespace
 * - numbers in shortest form (no trailing zeros / scientific unless needed)
 * - arrays preserve order
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "7000"; // ~0.007 USDC

function hasValidPayment(req: NextRequest): boolean {
  // STUB: replace with real x402 / facilitator verification in production
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Non-finite numbers are not allowed in JCS");
    }
    // ECMAScript number-to-string is already close; ensure no trailing zeros on integers
    return Number.isInteger(value) ? String(value) : JSON.stringify(value);
  }
  if (typeof value === "string") {
    return JSON.stringify(value); // handles escaping
  }
  if (Array.isArray(value)) {
    return "[" + value.map((v) => canonicalize(v)).join(",") + "]";
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const parts = keys.map((k) => {
      const v = (value as Record<string, unknown>)[k];
      // skip undefined (JSON.stringify behavior)
      if (v === undefined) return null;
      return JSON.stringify(k) + ":" + canonicalize(v);
    }).filter(Boolean);
    return "{" + parts.join(",") + "}";
  }
  throw new Error("Unsupported type");
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Deterministic JSON Canonicalization Scheme (JCS-style). Stable keys, no whitespace. For signing & content-addressing.",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-json-canonicalizer", version: "1.0.0" },
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
    // Accept either { data: ... } or the raw object itself
    const data = body && typeof body === "object" && "data" in body && Object.keys(body).length === 1
      ? body.data
      : body;

    const canonical = canonicalize(data);
    const byteLength = Buffer.byteLength(canonical, "utf8");

    if (byteLength > 1_000_000) {
      return NextResponse.json({ error: "Canonical result too large (max 1MB)" }, { status: 413 });
    }

    return NextResponse.json({
      success: true,
      result: canonical,
      meta: {
        byteLength,
        keyCount: typeof data === "object" && data !== null && !Array.isArray(data)
          ? Object.keys(data).length
          : null,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Invalid JSON or non-canonicalizable value" },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-json-canonicalizer",
    description: "Deterministic JSON Canonicalization (JCS-style). Agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/canonicalize" },
  });
}
