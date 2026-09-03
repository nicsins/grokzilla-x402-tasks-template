import { NextRequest, NextResponse } from "next/server";

/**
 * x402 UUID Toolkit – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.009 USDC per call
 *
 * Accepts: { "action": "generate"|"validate"|"parse", "version": "v4"|"v7"|"nil"|"max", "uuid": string, "count": number }
 * Returns: { "success": true, "result": any, "meta": {...} }
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

function randomBytes(n: number): Uint8Array {
  const arr = new Uint8Array(n);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < n; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
}

function bytesToUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function generateV4(): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  return bytesToUuid(bytes);
}

function generateV7(): string {
  // Approximate UUIDv7: 48-bit unix ms timestamp + random
  const now = Date.now();
  const bytes = randomBytes(16);
  // timestamp big-endian in first 6 bytes
  bytes[0] = (now / 0x10000000000) & 0xff;
  bytes[1] = (now / 0x100000000) & 0xff;
  bytes[2] = (now / 0x1000000) & 0xff;
  bytes[3] = (now / 0x10000) & 0xff;
  bytes[4] = (now / 0x100) & 0xff;
  bytes[5] = now & 0xff;
  bytes[6] = (bytes[6] & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  return bytesToUuid(bytes);
}

const NIL = "00000000-0000-0000-0000-000000000000";
const MAX = "ffffffff-ffff-ffff-ffff-ffffffffffff";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseUuid(uuid: string) {
  if (!UUID_RE.test(uuid)) return null;
  const parts = uuid.toLowerCase().split("-");
  const version = parseInt(parts[2][0], 16);
  const variantNibble = parseInt(parts[3][0], 16);
  let variant = "unknown";
  if (variantNibble >= 8 && variantNibble <= 0xb) variant = "RFC4122";
  else if (variantNibble >= 0xc && variantNibble <= 0xd) variant = "Microsoft";
  else if (variantNibble >= 0xe) variant = "future";
  return {
    uuid: uuid.toLowerCase(),
    version,
    variant,
    isNil: uuid.toLowerCase() === NIL,
    isMax: uuid.toLowerCase() === MAX,
  };
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "UUID generate / validate / parse (v4, v7, nil, max) – agent-native",
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
    const body = await req.json().catch(() => ({}));
    const action = (body.action || "generate").toLowerCase();
    const version = (body.version || "v4").toLowerCase();
    let count = Math.min(Math.max(parseInt(body.count || "1", 10) || 1, 1), 20);

    if (action === "generate") {
      const results: string[] = [];
      for (let i = 0; i < count; i++) {
        if (version === "v7") results.push(generateV7());
        else if (version === "nil") results.push(NIL);
        else if (version === "max") results.push(MAX);
        else results.push(generateV4());
      }
      return NextResponse.json({
        success: true,
        result: count === 1 ? results[0] : results,
        meta: { action, version, count },
      });
    }

    if (action === "validate" || action === "parse") {
      const uuid = String(body.uuid || "").trim();
      if (!uuid) {
        return NextResponse.json({ error: "Missing 'uuid' field" }, { status: 400 });
      }
      const parsed = parseUuid(uuid);
      if (!parsed) {
        return NextResponse.json({
          success: true,
          result: { valid: false },
          meta: { action },
        });
      }
      return NextResponse.json({
        success: true,
        result: action === "validate" ? { valid: true, ...parsed } : parsed,
        meta: { action },
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Allowed: generate, validate, parse" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-uuid-toolkit",
    description: "Generate, validate and parse UUIDs (v4/v7/nil/max). Agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/generate" },
  });
}
