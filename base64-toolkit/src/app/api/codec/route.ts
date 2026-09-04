import { NextRequest, NextResponse } from "next/server";

/**
 * x402 Base64 Toolkit – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.008 USDC per call
 *
 * Accepts: { "action": "encode"|"decode", "data": string, "urlSafe"?: boolean, "asJson"?: boolean }
 * Returns: { "success": true, "result": string, "meta": {...} }
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

function encodeBase64(input: string, urlSafe: boolean): string {
  const buf = Buffer.from(input, "utf8");
  let b64 = buf.toString("base64");
  if (urlSafe) {
    b64 = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  return b64;
}

function decodeBase64(input: string, urlSafe: boolean): string {
  let b64 = String(input || "").trim();
  if (urlSafe) {
    b64 = b64.replace(/-/g, "+").replace(/_/g, "/");
    // pad
    while (b64.length % 4 !== 0) b64 += "=";
  }
  return Buffer.from(b64, "base64").toString("utf8");
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Encode or decode Base64 (standard or URL-safe). Deterministic agent utility.",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-base64-toolkit", version: "1.0.0" },
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
    const action = (body.action || body.mode || "encode").toLowerCase();
    const data = body.data !== undefined ? String(body.data) : "";
    const urlSafe = Boolean(body.urlSafe ?? body.url_safe ?? false);

    if (!data) {
      return NextResponse.json({ error: "Missing or empty 'data' field" }, { status: 400 });
    }
    if (data.length > 200_000) {
      return NextResponse.json({ error: "Input too large (max 200k chars)" }, { status: 413 });
    }
    if (!["encode", "decode"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid 'action'. Allowed: encode | decode" },
        { status: 400 }
      );
    }

    let result: string;
    if (action === "encode") {
      result = encodeBase64(data, urlSafe);
    } else {
      try {
        result = decodeBase64(data, urlSafe);
      } catch {
        return NextResponse.json({ error: "Invalid base64 input" }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      result,
      meta: {
        action,
        urlSafe,
        inputLength: data.length,
        resultLength: result.length,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-base64-toolkit",
    description: "Deterministic Base64 encode/decode (standard + URL-safe). Agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/codec" },
  });
}
