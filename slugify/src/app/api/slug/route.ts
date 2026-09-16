import { NextRequest, NextResponse } from "next/server";

/**
 * x402Slugify – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.007 USDC per call
 *
 * Accepts: { "text": string, "maxLength"?: number, "separator"?: string }
 * Returns: { "success": true, "slug": string, "meta": {...} }
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

function slugify(text: string, separator = "-", maxLength = 120): string {
  if (!text || typeof text !== "string") return "";

  // Basic transliteration map for common non-ASCII
  const map: Record<string, string> = {
    "à": "a", "á": "a", "â": "a", "ã": "a", "ä": "a", "å": "a", "æ": "ae",
    "ç": "c", "è": "e", "é": "e", "ê": "e", "ë": "e", "ì": "i", "í": "i",
    "î": "i", "ï": "i", "ñ": "n", "ò": "o", "ó": "o", "ô": "o", "õ": "o",
    "ö": "o", "ø": "o", "ù": "u", "ú": "u", "û": "u", "ü": "u", "ý": "y",
    "ÿ": "y", "ß": "ss", "œ": "oe",
  };

  let s = text.toLowerCase().trim();
  s = s.replace(/[àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿßœ]/g, (ch) => map[ch] || ch);
  s = s.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""); // strip remaining diacritics
  s = s.replace(/[^a-z0-9]+/g, separator);
  s = s.replace(new RegExp(`^\\${separator}+|\\${separator}+$`, "g"), "");
  s = s.replace(new RegExp(`\\${separator}{2,}`, "g"), separator);

  if (maxLength > 0 && s.length > maxLength) {
    s = s.slice(0, maxLength);
    s = s.replace(new RegExp(`\\${separator}+$`), "");
  }

  return s;
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Generate deterministic URL-safe slug from text (lowercase, hyphenated, ASCII-normalized)",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-slugify", version: "1.0.0" },
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
    if (text.length > 50_000) {
      return NextResponse.json({ error: "Input too large (max 50k chars)" }, { status: 413 });
    }

    const separator = (body.separator || "-").toString().slice(0, 3) || "-";
    const maxLength = Math.min(Math.max(Number(body.maxLength) || 120, 1), 500);

    const slug = slugify(text, separator, maxLength);

    return NextResponse.json({
      success: true,
      slug,
      meta: {
        originalLength: text.length,
        slugLength: slug.length,
        separator,
        maxLength,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-slugify",
    description: "Deterministic URL-safe slug generator. Agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/slug" },
  });
}
