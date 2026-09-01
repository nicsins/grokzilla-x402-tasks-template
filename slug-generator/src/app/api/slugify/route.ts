import { NextRequest, NextResponse } from "next/server";

/**
 * x402 Slug Generator – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.01 USDC per call
 *
 * Accepts: { "text": string, "options"?: { "separator": string, "lower": boolean, "maxLength": number, "strict": boolean } }
 * Returns: { "success": true, "slug": string, "meta": {...} }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "8000"; // ~0.008 USDC

function hasValidPayment(req: NextRequest): boolean {
  // STUB: replace with real x402 / facilitator verification in production
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function slugify(
  text: string,
  sep = "-",
  lower = true,
  maxLength = 80,
  strict = true
): string {
  let s = String(text || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  if (lower) s = s.toLowerCase();
  // replace non-alphanumeric with separator
  s = s.replace(/[^a-z0-9]+/gi, sep);
  if (strict) {
    s = s.replace(new RegExp(`^${sep}+|${sep}+$`, "g"), "");
    s = s.replace(new RegExp(`${sep}{2,}`, "g"), sep);
  }
  if (maxLength > 0 && s.length > maxLength) {
    s = s.slice(0, maxLength);
    s = s.replace(new RegExp(`${sep}+$`), "");
  }
  return s || "item";
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Generate clean URL / SEO slug from arbitrary text (deterministic)",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-slug-generator", version: "1.0.0" },
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
    const text = body.text !== undefined ? String(body.text) : String(body);
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "Missing or empty 'text' field" }, { status: 400 });
    }

    const options = body.options || {};
    const separator = typeof options.separator === "string" ? options.separator : "-";
    const lower = options.lower !== false;
    const maxLength = Math.min(Number(options.maxLength) || 80, 200);
    const strict = options.strict !== false;

    const slug = slugify(text, separator, lower, maxLength, strict);

    return NextResponse.json({
      success: true,
      slug,
      meta: {
        originalLength: text.length,
        slugLength: slug.length,
        separator,
        lower,
        maxLength,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-slug-generator",
    description: "Deterministic text → clean URL/SEO slug. Agent-ready, low variance.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/slugify" },
  });
}
