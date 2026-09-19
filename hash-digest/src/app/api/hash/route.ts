import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

/**
 * x402 Hash Digest – No-human-in-loop microservice
 * Price guidance: 0.002 – 0.006 USDC per call
 *
 * Actions:
 *  - digest: { action?: "digest", algorithm?: "sha256"|"sha512"|"sha1"|"md5",
 *              input: string, encoding?: "utf8"|"hex" }
 *    → { hex, base64, byteLength, algorithm }
 *
 * Input size limited to 1 MB.
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "3000"; // ~0.003 USDC
const MAX_BYTES = 1_048_576; // 1 MB

const ALGO_MAP: Record<string, string> = {
  sha256: "sha256",
  "sha-256": "sha256",
  sha512: "sha512",
  "sha-512": "sha512",
  sha1: "sha1",
  "sha-1": "sha1",
  md5: "md5",
};

function hasValidPayment(req: NextRequest): boolean {
  // STUB: replace with real x402 / facilitator verification in production
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function paymentRequired(req: NextRequest) {
  const paymentRequirements = {
    scheme: "exact",
    network: NETWORK,
    maxAmountRequired: MAX_AMOUNT,
    resource: req.url,
    description:
      "Compute SHA-256 / SHA-512 / SHA-1 / MD5 digests of utf8 or hex input. Returns hex + base64.",
    mimeType: "application/json",
    payTo: PAY_TO,
    extra: { name: "x402-hash-digest", version: "1.0.0" },
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

function decodeInput(input: string, encoding: string): { ok: true; buf: Buffer } | { ok: false; error: string } {
  if (encoding === "hex") {
    const cleaned = String(input).replace(/\s+/g, "").replace(/^0x/i, "");
    if (!/^[0-9a-fA-F]*$/.test(cleaned) || cleaned.length % 2 !== 0) {
      return { ok: false, error: "Invalid hex input (must be even-length hex digits)" };
    }
    const buf = Buffer.from(cleaned, "hex");
    return { ok: true, buf };
  }
  return { ok: true, buf: Buffer.from(String(input), "utf8") };
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) return paymentRequired(req);

  try {
    const body = await req.json();
    const action = String(body.action || "digest").toLowerCase();

    if (action !== "digest") {
      return NextResponse.json(
        { error: "Invalid action. Use digest" },
        { status: 400 }
      );
    }

    if (body.input === undefined || body.input === null) {
      return NextResponse.json({ error: "Missing 'input' field" }, { status: 400 });
    }

    const algoKey = String(body.algorithm || body.algo || "sha256").toLowerCase();
    const nodeAlgo = ALGO_MAP[algoKey];
    if (!nodeAlgo) {
      return NextResponse.json(
        { error: "Invalid algorithm. Allowed: sha256, sha512, sha1, md5" },
        { status: 400 }
      );
    }

    const encoding = String(body.encoding || "utf8").toLowerCase();
    if (encoding !== "utf8" && encoding !== "hex") {
      return NextResponse.json(
        { error: "Invalid encoding. Allowed: utf8, hex" },
        { status: 400 }
      );
    }

    const decoded = decodeInput(String(body.input), encoding);
    if (!decoded.ok) {
      return NextResponse.json({ error: decoded.error }, { status: 400 });
    }

    if (decoded.buf.length > MAX_BYTES) {
      return NextResponse.json(
        { error: `Input too large (max ${MAX_BYTES} bytes / 1 MB)` },
        { status: 413 }
      );
    }

    const hash = createHash(nodeAlgo).update(decoded.buf).digest();
    const hex = hash.toString("hex");
    const base64 = hash.toString("base64");

    return NextResponse.json({
      success: true,
      result: {
        algorithm: nodeAlgo,
        hex,
        base64,
        byteLength: decoded.buf.length,
        digestBytes: hash.length,
      },
      meta: {
        action: "digest",
        encoding,
        inputByteLength: decoded.buf.length,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-hash-digest",
    description:
      "Compute SHA-256 / SHA-512 / SHA-1 / MD5 digests of utf8 or hex input. Returns hex + base64. Agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/hash" },
  });
}
