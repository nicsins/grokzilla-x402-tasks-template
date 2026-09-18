import { NextRequest, NextResponse } from "next/server";

/**
 * x402 Slugify Toolkit – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.007 USDC per call
 *
 * Input:  { text: string, options?: { separator?, maxLength?, lowercase?, preserveCase? } }
 * Output: { success, original, slug, length }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "5000"; // ~0.005 USDC

// Basic diacritic / common transliteration map (deterministic, no external deps)
const CHAR_MAP: Record<string, string> = {
  à: "a", á: "a", â: "a", ã: "a", ä: "a", å: "a", æ: "ae",
  ç: "c", è: "e", é: "e", ê: "e", ë: "e", ì: "i", í: "i", î: "i", ï: "i",
  ñ: "n", ò: "o", ó: "o", ô: "o", õ: "o", ö: "o", ø: "o", œ: "oe",
  ù: "u", ú: "u", û: "u", ü: "u", ý: "y", ÿ: "y",
  À: "A", Á: "A", Â: "A", Ã: "A", Ä: "A", Å: "A", Æ: "AE",
  Ç: "C", È: "E", É: "E", Ê: "E", Ë: "E", Ì: "I", Í: "I", Î: "I", Ï: "I",
  Ñ: "N", Ò: "O", Ó: "O", Ô: "O", Õ: "O", Ö: "O", Ø: "O", Œ: "OE",
  Ù: "U", Ú: "U", Û: "U", Ü: "U", Ý: "Y", ß: "ss",
  "’": "", "'": "", "“": "", "”": "", "–": "-", "—": "-",
};

function hasValidPayment(req: NextRequest): boolean {
  // STUB: replace with real x402 / facilitator verification in production
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function slugify(text: string, options: {
  separator?: string;
  maxLength?: number;
  lowercase?: boolean;
} = {}): string {
  const sep = options.separator ?? "-";
  const maxLen = Math.max(1, Math.min(500, options.maxLength ?? 80));
  const lower = options.lowercase !== false;

  let s = text.normalize("NFKD");
  // apply map
  s = Array.from(s).map((c) => CHAR_MAP[c] ?? c).join("");
  // remove combining marks remaining
  s = s.replace(/[\u0300-\u036f]/g, "");
  // keep only alphanum + spaces + hyphen
  s = s.replace(/[^a-zA-Z0-9\s\-_.]/g, "");
  // collapse whitespace/hyphens to separator
  s = s.replace(/[\s\-_.]+/g, sep);
  // trim separators
  s = s.replace(new RegExp(`^\\${sep}+|\\${sep}+$`, "g"), "");
  if (lower) s = s.toLowerCase();
  if (s.length > maxLen) {
    s = s.slice(0, maxLen);
    s = s.replace(new RegExp(`\\${sep}+$`), "");
  }
  return s || "slug";
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Unicode-aware deterministic slug generation for URLs, filenames, and agent resource IDs.",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-slugify-toolkit", version: "1.0.0" },
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
    const text = body.text;
    if (typeof text !== "string") {
      return NextResponse.json({ error: "text (string) is required" }, { status: 400 });
    }
    const options = body.options || {};
    const slug = slugify(text, options);
    return NextResponse.json({
      success: true,
      original: text,
      slug,
      length: slug.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Invalid request" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-slugify-toolkit",
    description: "Deterministic Unicode-aware slug generation. Agent-ready utility for paths and IDs.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/slugify" },
  });
}
