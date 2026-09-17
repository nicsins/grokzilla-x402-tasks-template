import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

/**
 * x402 UUID Toolkit – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.008 USDC per call
 *
 * Actions:
 *  - generate: { action: "generate", version?: 4|7 } → new UUID
 *  - validate: { action: "validate", uuid: string } → validity + version/variant
 *  - parse:    { action: "parse", uuid: string } → structured fields + timestamp (v7)
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

function generateV4(): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function generateV7(): string {
  // Unix timestamp in ms (48 bits) + version/variant + random
  const now = Date.now();
  const bytes = randomBytes(16);
  // timestamp (ms) into first 6 bytes
  bytes[0] = (now / 2 ** 40) & 0xff;
  bytes[1] = (now / 2 ** 32) & 0xff;
  bytes[2] = (now / 2 ** 24) & 0xff;
  bytes[3] = (now / 2 ** 16) & 0xff;
  bytes[4] = (now / 2 ** 8) & 0xff;
  bytes[5] = now & 0xff;
  bytes[6] = (bytes[6] & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseUuid(uuid: string) {
  const clean = String(uuid || "").trim().toLowerCase();
  if (!UUID_RE.test(clean)) {
    return { valid: false, error: "Invalid UUID format" };
  }
  const hex = clean.replace(/-/g, "");
  const version = parseInt(hex[12], 16);
  const variantNibble = parseInt(hex[16], 16);
  const variant = variantNibble >= 8 && variantNibble <= 11 ? "RFC4122" : "other";
  let timestampMs: number | null = null;
  if (version === 7) {
    // reconstruct 48-bit ms timestamp
    timestampMs =
      (parseInt(hex.slice(0, 2), 16) << 40) +
      (parseInt(hex.slice(2, 4), 16) << 32) +
      (parseInt(hex.slice(4, 6), 16) << 24) +
      (parseInt(hex.slice(6, 8), 16) << 16) +
      (parseInt(hex.slice(8, 10), 16) << 8) +
      parseInt(hex.slice(10, 12), 16);
  }
  return {
    valid: true,
    uuid: clean,
    version,
    variant,
    timestampMs,
    timestampISO: timestampMs ? new Date(timestampMs).toISOString() : null,
  };
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Generate, validate, or parse UUIDs (v4/v7). Deterministic + pure crypto.",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-uuid-toolkit", version: "1.0.0" },
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
    const action = String(body.action || "").toLowerCase();

    if (action === "generate") {
      const version = Number(body.version) === 7 ? 7 : 4;
      const uuid = version === 7 ? generateV7() : generateV4();
      return NextResponse.json({
        success: true,
        result: { uuid, version },
        meta: { action: "generate", generatedAt: new Date().toISOString() },
      });
    }

    if (action === "validate" || action === "parse") {
      const uuid = body.uuid;
      if (!uuid) {
        return NextResponse.json({ error: "Missing 'uuid' field" }, { status: 400 });
      }
      const parsed = parseUuid(uuid);
      if (action === "validate") {
        return NextResponse.json({
          success: true,
          result: { valid: parsed.valid, version: parsed.version ?? null, variant: parsed.variant ?? null },
          meta: { action: "validate" },
        });
      }
      return NextResponse.json({
        success: true,
        result: parsed,
        meta: { action: "parse" },
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use generate | validate | parse" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-uuid-toolkit",
    description: "Generate (v4/v7), validate, and parse UUIDs. Agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/uuid" },
  });
}
