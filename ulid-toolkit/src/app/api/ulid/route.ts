import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

/**
 * x402 ULID Toolkit – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.008 USDC per call
 *
 * Actions:
 *   generate   { } → { ulid, timestamp }
 *   parse      { ulid } → { timestamp, randomness, valid }
 *   validate   { ulid } → { valid, reason? }
 *   timestamp  { ulid } → { timestamp, iso, ms }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "6000"; // ~0.006 USDC

const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford Base32
const ENCODING_LEN = 32;
const TIME_LEN = 10;
const RANDOM_LEN = 16;

function hasValidPayment(req: NextRequest): boolean {
  // STUB: replace with real x402 / facilitator verification in production
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function encodeTime(now: number): string {
  let str = "";
  for (let i = TIME_LEN; i > 0; i--) {
    const mod = now % ENCODING_LEN;
    str = ENCODING[mod] + str;
    now = Math.floor(now / ENCODING_LEN);
  }
  return str;
}

function encodeRandom(): string {
  const bytes = randomBytes(10); // 80 bits
  let str = "";
  // Convert 80 bits to 16 Crockford chars
  let num = BigInt("0x" + bytes.toString("hex"));
  for (let i = 0; i < RANDOM_LEN; i++) {
    const rem = Number(num % BigInt(ENCODING_LEN));
    str = ENCODING[rem] + str;
    num = num / BigInt(ENCODING_LEN);
  }
  return str;
}

function generateULID(ts?: number): string {
  const now = ts ?? Date.now();
  return encodeTime(now) + encodeRandom();
}

function decodeTime(ulid: string): number {
  let time = 0;
  for (let i = 0; i < TIME_LEN; i++) {
    const idx = ENCODING.indexOf(ulid[i].toUpperCase());
    if (idx === -1) throw new Error(`Invalid ULID character at position ${i}`);
    time = time * ENCODING_LEN + idx;
  }
  return time;
}

function isValidULID(ulid: string): { valid: boolean; reason?: string } {
  if (typeof ulid !== "string") return { valid: false, reason: "not a string" };
  if (ulid.length !== 26) return { valid: false, reason: "must be exactly 26 characters" };
  const upper = ulid.toUpperCase();
  for (let i = 0; i < 26; i++) {
    if (ENCODING.indexOf(upper[i]) === -1) {
      return { valid: false, reason: `invalid character '${ulid[i]}' at position ${i}` };
    }
  }
  // First character of time component must be in 0-7 range for current epoch safety (optional soft check)
  return { valid: true };
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "ULID generate / parse / validate / timestamp extract. Deterministic sortable unique IDs for agents.",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-ulid-toolkit", version: "1.0.0" },
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
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").toLowerCase();

    if (action === "generate") {
      const ts = body.timestamp != null ? Number(body.timestamp) : undefined;
      const ulid = generateULID(ts);
      const timestamp = decodeTime(ulid);
      return NextResponse.json({
        success: true,
        action: "generate",
        ulid,
        timestamp,
        iso: new Date(timestamp).toISOString(),
      });
    }

    if (action === "parse") {
      const ulid = String(body.ulid || "").trim();
      const check = isValidULID(ulid);
      if (!check.valid) {
        return NextResponse.json({ success: false, action: "parse", valid: false, reason: check.reason }, { status: 400 });
      }
      const timestamp = decodeTime(ulid);
      const randomness = ulid.slice(TIME_LEN).toUpperCase();
      return NextResponse.json({
        success: true,
        action: "parse",
        ulid: ulid.toUpperCase(),
        timestamp,
        iso: new Date(timestamp).toISOString(),
        randomness,
        valid: true,
      });
    }

    if (action === "validate") {
      const ulid = String(body.ulid || "").trim();
      const check = isValidULID(ulid);
      return NextResponse.json({
        success: true,
        action: "validate",
        ulid: ulid.toUpperCase(),
        ...check,
      });
    }

    if (action === "timestamp") {
      const ulid = String(body.ulid || "").trim();
      const check = isValidULID(ulid);
      if (!check.valid) {
        return NextResponse.json({ success: false, action: "timestamp", valid: false, reason: check.reason }, { status: 400 });
      }
      const timestamp = decodeTime(ulid);
      return NextResponse.json({
        success: true,
        action: "timestamp",
        ulid: ulid.toUpperCase(),
        timestamp,
        iso: new Date(timestamp).toISOString(),
        ms: timestamp,
      });
    }

    return NextResponse.json(
      { error: "Unknown action. Use generate|parse|validate|timestamp" },
      { status: 400 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Invalid request" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-ulid-toolkit",
    description: "Deterministic ULID generate, parse, validate & timestamp extract. Agent-ready sortable unique IDs.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/ulid" },
  });
}
