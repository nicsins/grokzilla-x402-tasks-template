import { NextRequest, NextResponse } from "next/server";

/**
 * x402 Querystring Toolkit – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.007 USDC per call
 *
 * Accepts: { "action": "parse"|"stringify"|"normalize", "input": string|object, "options"?: {...} }
 * Returns: { "success": true, "result": ..., "meta": {...} }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "5000"; // ~0.005 USDC

function hasValidPayment(req: NextRequest): boolean {
  // STUB: replace with real x402 / facilitator verification in production
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function parseQuery(qs: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  const clean = qs.startsWith("?") ? qs.slice(1) : qs;
  if (!clean) return result;

  for (const pair of clean.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const rawVal = eq === -1 ? "" : pair.slice(eq + 1);
    const key = decodeURIComponent(rawKey.replace(/\+/g, " "));
    const val = decodeURIComponent(rawVal.replace(/\+/g, " "));

    if (key in result) {
      const existing = result[key];
      if (Array.isArray(existing)) {
        existing.push(val);
      } else {
        result[key] = [existing, val];
      }
    } else {
      result[key] = val;
    }
  }
  return result;
}

function stringifyQuery(obj: Record<string, unknown>, options: { sort?: boolean; arrayFormat?: "repeat" | "brackets" } = {}): string {
  const { sort = true, arrayFormat = "repeat" } = options;
  const keys = Object.keys(obj);
  if (sort) keys.sort();

  const parts: string[] = [];
  for (const key of keys) {
    const value = obj[key];
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        const k = arrayFormat === "brackets" ? `${key}[]` : key;
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(item))}`);
      }
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.join("&");
}

function normalizeQuery(qs: string, options: { sort?: boolean; stripEmpty?: boolean } = {}): string {
  const { sort = true, stripEmpty = true } = options;
  const parsed = parseQuery(qs);
  if (stripEmpty) {
    for (const k of Object.keys(parsed)) {
      const v = parsed[k];
      if (v === "" || (Array.isArray(v) && v.every((x) => x === ""))) {
        delete parsed[k];
      }
    }
  }
  return stringifyQuery(parsed, { sort, arrayFormat: "repeat" });
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Parse, stringify, or normalize query strings with stable ordering – deterministic",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-querystring-toolkit", version: "1.0.0" },
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
    const action = (body.action || "parse").toLowerCase();
    const input = body.input !== undefined ? body.input : body.qs || body.query || body;

    if (action === "parse") {
      if (typeof input !== "string") {
        return NextResponse.json({ error: "'input' must be a string for parse" }, { status: 400 });
      }
      if (input.length > 100_000) {
        return NextResponse.json({ error: "Input too large" }, { status: 413 });
      }
      const result = parseQuery(input);
      return NextResponse.json({
        success: true,
        result,
        meta: { action: "parse", keyCount: Object.keys(result).length },
      });
    }

    if (action === "stringify") {
      if (typeof input !== "object" || input === null || Array.isArray(input)) {
        return NextResponse.json({ error: "'input' must be an object for stringify" }, { status: 400 });
      }
      const options = body.options || {};
      const result = stringifyQuery(input as Record<string, unknown>, options);
      return NextResponse.json({
        success: true,
        result,
        meta: { action: "stringify", length: result.length },
      });
    }

    if (action === "normalize") {
      if (typeof input !== "string") {
        return NextResponse.json({ error: "'input' must be a string for normalize" }, { status: 400 });
      }
      if (input.length > 100_000) {
        return NextResponse.json({ error: "Input too large" }, { status: 413 });
      }
      const options = body.options || {};
      const result = normalizeQuery(input, options);
      return NextResponse.json({
        success: true,
        result,
        meta: { action: "normalize", originalLength: input.length, resultLength: result.length },
      });
    }

    return NextResponse.json({ error: "Invalid action. Use parse | stringify | normalize" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-querystring-toolkit",
    description: "Deterministic query-string parse / stringify / normalize. Agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/qs" },
  });
}
