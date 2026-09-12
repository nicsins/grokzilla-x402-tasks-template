import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

/**
 * x402 Base58 Toolkit – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.008 USDC per call
 *
 * Actions:
 *   encode       { data, encoding? } → { base58 }
 *   decode       { data } → { bytesHex, text? }
 *   encodeCheck  { data, encoding?, version? } → { base58check }
 *   decodeCheck  { data } → { version, payloadHex, valid }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "6000"; // ~0.006 USDC

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE = BigInt(58);

function hasValidPayment(req: NextRequest): boolean {
  // STUB: replace with real x402 / facilitator verification in production
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function encodeBase58(buffer: Buffer): string {
  if (buffer.length === 0) return "";
  let num = BigInt("0x" + buffer.toString("hex"));
  let encoded = "";
  while (num > 0n) {
    const rem = Number(num % BASE);
    encoded = ALPHABET[rem] + encoded;
    num = num / BASE;
  }
  // leading zeros
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
    encoded = "1" + encoded;
  }
  return encoded || "1";
}

function decodeBase58(str: string): Buffer {
  let num = 0n;
  for (const c of str) {
    const idx = ALPHABET.indexOf(c);
    if (idx === -1) throw new Error(`Invalid Base58 character: ${c}`);
    num = num * BASE + BigInt(idx);
  }
  let hex = num.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  const bytes = Buffer.from(hex, "hex");
  // restore leading zeros
  let leading = 0;
  for (const c of str) {
    if (c === "1") leading++;
    else break;
  }
  return Buffer.concat([Buffer.alloc(leading), bytes]);
}

function doubleSha256(buf: Buffer): Buffer {
  return createHash("sha256").update(createHash("sha256").update(buf).digest()).digest();
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Base58 / Base58Check encode & decode. Deterministic agent utility for crypto and binary-to-text.",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-base58-toolkit", version: "1.0.0" },
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
    const data = body.data;
    const encoding = (body.encoding || "utf8").toLowerCase();

    if (action === "encode") {
      if (typeof data !== "string") return NextResponse.json({ error: "data must be string" }, { status: 400 });
      const buf = encoding === "hex" ? Buffer.from(data.replace(/^0x/, ""), "hex") : Buffer.from(data, "utf8");
      const base58 = encodeBase58(buf);
      return NextResponse.json({ success: true, action: "encode", base58, length: base58.length });
    }

    if (action === "decode") {
      if (typeof data !== "string") return NextResponse.json({ error: "data must be base58 string" }, { status: 400 });
      const buf = decodeBase58(data.trim());
      let text: string | undefined;
      try { text = buf.toString("utf8"); if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text)) text = undefined; } catch {}
      return NextResponse.json({ success: true, action: "decode", bytesHex: buf.toString("hex"), text, length: buf.length });
    }

    if (action === "encodecheck" || action === "encode_check") {
      if (typeof data !== "string") return NextResponse.json({ error: "data must be string" }, { status: 400 });
      const version = Math.max(0, Math.min(255, Number(body.version) || 0));
      const payload = encoding === "hex" ? Buffer.from(data.replace(/^0x/, ""), "hex") : Buffer.from(data, "utf8");
      const versioned = Buffer.concat([Buffer.from([version]), payload]);
      const checksum = doubleSha256(versioned).subarray(0, 4);
      const full = Buffer.concat([versioned, checksum]);
      const base58check = encodeBase58(full);
      return NextResponse.json({ success: true, action: "encodeCheck", base58check, version, length: base58check.length });
    }

    if (action === "decodecheck" || action === "decode_check") {
      if (typeof data !== "string") return NextResponse.json({ error: "data must be base58check string" }, { status: 400 });
      const buf = decodeBase58(data.trim());
      if (buf.length < 5) return NextResponse.json({ error: "Too short for Base58Check" }, { status: 400 });
      const version = buf[0];
      const payload = buf.subarray(1, buf.length - 4);
      const checksum = buf.subarray(buf.length - 4);
      const expected = doubleSha256(buf.subarray(0, buf.length - 4)).subarray(0, 4);
      const valid = checksum.equals(expected);
      return NextResponse.json({
        success: true,
        action: "decodeCheck",
        version,
        payloadHex: payload.toString("hex"),
        valid,
        length: payload.length,
      });
    }

    return NextResponse.json({ error: "Unknown action. Use encode|decode|encodeCheck|decodeCheck" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Invalid request" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-base58-toolkit",
    description: "Deterministic Base58 / Base58Check encode & decode. Agent-ready crypto utility.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/base58" },
  });
}
