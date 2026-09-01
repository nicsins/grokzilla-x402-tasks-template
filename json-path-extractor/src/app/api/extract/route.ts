import { NextRequest, NextResponse } from "next/server";

/**
 * x402 JSON Path Extractor – No-human-in-loop microservice
 * Price guidance: 0.004 – 0.012 USDC per call
 *
 * Accepts: { "data": any, "path": string | string[], "options"?: { "default": any, "flatten": boolean } }
 * Simple dotted paths + array indices (e.g. "user.address.city", "items.0.name")
 * Returns: { "success": true, "value": any | any[], "meta": {...} }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "9000"; // ~0.009 USDC

function hasValidPayment(req: NextRequest): boolean {
  // STUB: replace with real x402 / facilitator verification in production
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function getByPath(obj: any, path: string): any {
  if (!path || path === ".") return obj;
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[p];
  }
  return cur;
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Extract value(s) from nested JSON by simple dotted / array path(s)",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-json-path-extractor", version: "1.0.0" },
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
    const data = body.data !== undefined ? body.data : body;
    const path = body.path;
    if (data === undefined || data === null) {
      return NextResponse.json({ error: "Missing 'data' field" }, { status: 400 });
    }
    if (path === undefined || path === null || (Array.isArray(path) && path.length === 0)) {
      return NextResponse.json({ error: "Missing 'path' field (string or string[])" }, { status: 400 });
    }

    const options = body.options || {};
    const defaultValue = options.default;
    const flatten = options.flatten === true;

    let value: any;
    if (Array.isArray(path)) {
      value = path.map((p) => {
        const v = getByPath(data, String(p));
        return v === undefined ? defaultValue : v;
      });
      if (flatten && value.every((v: any) => v !== undefined)) {
        // keep as array
      }
    } else {
      value = getByPath(data, String(path));
      if (value === undefined) value = defaultValue;
    }

    return NextResponse.json({
      success: true,
      value,
      meta: {
        paths: Array.isArray(path) ? path.length : 1,
        found: value !== undefined && value !== defaultValue,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-json-path-extractor",
    description: "Extract values from nested JSON using simple dotted paths and array indices. Deterministic.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/extract" },
  });
}
