import { NextRequest, NextResponse } from "next/server";

/**
 * x402 PII Redactor – No-human-in-loop microservice
 * Price guidance: 0.008 – 0.025 USDC per call depending on text length
 *
 * Accepts: { "text": "...", "options"?: { "maskChar": "*", "keepFormat": true } }
 * Returns: { "redacted": "...", "stats": { emails: n, phones: n, ... } }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xYourPayToAddressHere";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "10000"; // 0.01 USDC (6 decimals)

// Simple but effective regex patterns (production: expand or add light NER)
const PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b(?:\d[ -]*?){13,19}\b/g,
  ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
};

function redactText(text: string, maskChar = "*") {
  let redacted = text;
  const stats: Record<string, number> = {};

  for (const [key, regex] of Object.entries(PATTERNS)) {
    const matches = text.match(regex) || [];
    stats[key] = matches.length;
    redacted = redacted.replace(regex, (m) => maskChar.repeat(Math.min(m.length, 8)));
  }

  return { redacted, stats };
}

function hasValidPayment(req: NextRequest): boolean {
  // STUB: In production replace with real x402 verification
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
      description: "PII redaction of provided text (emails, phones, SSNs, cards, IPs)",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: {
        name: "x402-pii-redactor",
        version: "1.0.0",
      },
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
    const text = body.text || body.input || "";
    if (typeof text !== "string" || text.length === 0) {
      return NextResponse.json({ error: "Missing or invalid 'text' field" }, { status: 400 });
    }
    if (text.length > 100_000) {
      return NextResponse.json({ error: "Text too long (max 100k chars)" }, { status: 413 });
    }

    const options = body.options || {};
    const result = redactText(text, options.maskChar || "*");

    return NextResponse.json({
      success: true,
      redacted: result.redacted,
      stats: result.stats,
      originalLength: text.length,
      redactedLength: result.redacted.length,
    });
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-pii-redactor",
    description: "Redact common PII patterns from text. Perfect for agents before logging or external calls.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: {
      POST: "/api/redact",
    },
  });
}
