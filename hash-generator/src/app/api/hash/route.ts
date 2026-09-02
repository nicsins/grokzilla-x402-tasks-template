import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

/**
 * x402 Hash Generator – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.008 USDC per call
 *
 * Accepts: { "text": string | object, "algorithm"?: "sha256"|"sha1"|"md5"|"sha512" }
 * Returns: { "success": true, "hash": string, "meta": {...} }
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

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Compute cryptographic hash (sha256/sha1/md5/sha512) of text or JSON – deterministic",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-hash-generator", version: "1.0.0" },
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
    let input: string;
    if (typeof body.text === "string") {
      input = body.text;
    } else if (body.text !== undefined) {
      input = JSON.stringify(body.text);
    } else if (typeof body === "string") {
      input = body;
    } else {
      input = JSON.stringify(body);
    }

    if (!input || input.length === 0) {
      return NextResponse.json({ error: "Missing or empty input" }, { status: 400 });
    }
    if (input.length > 500_000) {
      return NextResponse.json({ error: "Input too large (max 500k chars)" }, { status: 413 });
    }

    const algo = (body.algorithm || body.algo || "sha256").toLowerCase();
    const allowed = ["sha256", "sha1", "md5", "sha512"];
    if (!allowed.includes(algo)) {
      return NextResponse.json(
        { error: `Invalid algorithm. Allowed: ${allowed.join(", ")}` },
        { status: 400 }
      );
    }

    const hash = createHash(algo).update(input, "utf8").digest("hex");

    return NextResponse.json({
      success: true,
      hash,
      meta: {
        algorithm: algo,
        inputLength: input.length,
        encoding: "hex",
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-hash-generator",
    description: "Deterministic cryptographic hash (sha256/sha1/md5/sha512) of text or JSON. Agent-ready for content addressing & integrity.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/hash" },
  });
}
