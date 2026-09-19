import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * x402 HMAC Toolkit – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.008 USDC per call
 *
 * Actions:
 *   sign     { key, message, algorithm?, encoding? } → { hmac, algorithm }
 *   verify   { key, message, signature, algorithm?, encoding? } → { valid }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "6000"; // ~0.006 USDC

const ALLOWED_ALGOS = new Set(["sha256", "sha512", "sha1", "sha384"]);

function hasValidPayment(req: NextRequest): boolean {
  // STUB: replace with real x402 / facilitator verification in production
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function normalizeKey(key: string | Buffer, encoding: string): Buffer {
  if (Buffer.isBuffer(key)) return key;
  if (encoding === "hex") return Buffer.from(key.replace(/^0x/, ""), "hex");
  if (encoding === "base64") return Buffer.from(key, "base64");
  return Buffer.from(key, "utf8");
}

function normalizeMessage(msg: string | Buffer, encoding: string): Buffer {
  if (Buffer.isBuffer(msg)) return msg;
  if (encoding === "hex") return Buffer.from(msg.replace(/^0x/, ""), "hex");
  if (encoding === "base64") return Buffer.from(msg, "base64");
  return Buffer.from(msg, "utf8");
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "HMAC-SHA256/SHA512 sign & verify. Deterministic message authentication for agents.",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-hmac-toolkit", version: "1.0.0" },
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
    const action = String(body.action || "sign").toLowerCase();
    const algorithm = String(body.algorithm || "sha256").toLowerCase();
    const encoding = String(body.encoding || "utf8").toLowerCase(); // key & message input encoding
    const outputEncoding = String(body.outputEncoding || "hex").toLowerCase();

    if (!ALLOWED_ALGOS.has(algorithm)) {
      return NextResponse.json(
        { error: `Unsupported algorithm. Allowed: ${[...ALLOWED_ALGOS].join(", ")}` },
        { status: 400 }
      );
    }

    if (body.key == null || body.message == null) {
      return NextResponse.json({ error: "key and message are required" }, { status: 400 });
    }

    const keyBuf = normalizeKey(String(body.key), encoding);
    const msgBuf = normalizeMessage(String(body.message), encoding);

    if (keyBuf.length === 0) {
      return NextResponse.json({ error: "key cannot be empty" }, { status: 400 });
    }

    if (action === "sign") {
      const hmac = createHmac(algorithm, keyBuf).update(msgBuf).digest(outputEncoding as any);
      return NextResponse.json({
        success: true,
        action: "sign",
        algorithm,
        hmac,
        outputEncoding,
      });
    }

    if (action === "verify") {
      const provided = String(body.signature || body.hmac || "");
      if (!provided) {
        return NextResponse.json({ error: "signature (or hmac) is required for verify" }, { status: 400 });
      }
      const expected = createHmac(algorithm, keyBuf).update(msgBuf).digest();
      let providedBuf: Buffer;
      try {
        if (outputEncoding === "hex") {
          providedBuf = Buffer.from(provided.replace(/^0x/, ""), "hex");
        } else if (outputEncoding === "base64") {
          providedBuf = Buffer.from(provided, "base64");
        } else {
          providedBuf = Buffer.from(provided, "utf8");
        }
      } catch {
        return NextResponse.json({ success: true, action: "verify", valid: false, reason: "invalid signature encoding" });
      }
      const valid =
        providedBuf.length === expected.length && timingSafeEqual(providedBuf, expected);
      return NextResponse.json({
        success: true,
        action: "verify",
        algorithm,
        valid,
      });
    }

    return NextResponse.json({ error: "Unknown action. Use sign|verify" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Invalid request" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-hmac-toolkit",
    description: "HMAC sign & verify (SHA-256/512). Agent-ready message authentication primitive.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/hmac" },
  });
}
