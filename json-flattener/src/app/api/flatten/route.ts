import { NextRequest, NextResponse } from "next/server";

/**
 * x402 JSON Flattener – No-human-in-loop microservice
 * Price guidance: 0.004 – 0.012 USDC per call
 *
 * Accepts: { "data": any, "options"?: { "separator": string, "arrayStyle": "index"|"bracket", "maxDepth": number } }
 * Returns: { "success": true, "flat": Record<string, any>, "meta": {...} }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "10000"; // 0.01 USDC

function hasValidPayment(req: NextRequest): boolean {
  // STUB: replace with real x402 / facilitator verification in production
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function flatten(
  obj: any,
  prefix = "",
  sep = ".",
  arrayStyle: "index" | "bracket" = "index",
  maxDepth = 20,
  depth = 0,
  out: Record<string, any> = {}
): Record<string, any> {
  if (depth > maxDepth) {
    out[prefix || "root"] = "[max-depth-exceeded]";
    return out;
  }

  if (obj === null || typeof obj !== "object") {
    out[prefix || "root"] = obj;
    return out;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      out[prefix || "root"] = [];
      return out;
    }
    obj.forEach((item, i) => {
      const key =
        arrayStyle === "bracket"
          ? `${prefix}[${i}]`
          : prefix
          ? `${prefix}${sep}${i}`
          : String(i);
      flatten(item, key, sep, arrayStyle, maxDepth, depth + 1, out);
    });
    return out;
  }

  const keys = Object.keys(obj);
  if (keys.length === 0) {
    out[prefix || "root"] = {};
    return out;
  }

  for (const k of keys) {
    const newPrefix = prefix ? `${prefix}${sep}${k}` : k;
    flatten(obj[k], newPrefix, sep, arrayStyle, maxDepth, depth + 1, out);
  }
  return out;
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Flatten nested JSON to dotted path-value map (arrays supported)",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-json-flattener", version: "1.0.0" },
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
    if (data === undefined || data === null) {
      return NextResponse.json({ error: "Missing 'data' field" }, { status: 400 });
    }

    const options = body.options || {};
    const separator = typeof options.separator === "string" ? options.separator : ".";
    const arrayStyle = options.arrayStyle === "bracket" ? "bracket" : "index";
    const maxDepth = Math.min(Number(options.maxDepth) || 20, 50);

    const flat = flatten(data, "", separator, arrayStyle, maxDepth);
    const keys = Object.keys(flat);

    return NextResponse.json({
      success: true,
      flat,
      meta: {
        keys: keys.length,
        depth: maxDepth,
        separator,
        arrayStyle,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-json-flattener",
    description: "Flatten nested JSON objects/arrays into a single-level path-value map. Deterministic, agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/flatten" },
  });
}
