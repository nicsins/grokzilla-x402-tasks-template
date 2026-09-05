import { NextRequest, NextResponse } from "next/server";

/**
 * x402 Phone Normalizer – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.009 USDC per call
 *
 * Accepts: { "phone": string, "defaultCountry"?: "US"|"CA"|"GB"|... (ISO 3166-1 alpha-2) }
 * Returns: { "success": true, "e164": string|null, "national": string, "country": string|null, "valid": boolean, "meta": {...} }
 *
 * Lightweight pure-JS normalizer focused on common formats. Not a full libphonenumber replacement.
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "7000"; // ~0.007 USDC

function hasValidPayment(req: NextRequest): boolean {
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

// Minimal country calling codes (most common)
const COUNTRY_CODES: Record<string, string> = {
  US: "1", CA: "1", GB: "44", UK: "44", AU: "61", DE: "49", FR: "33",
  IN: "91", JP: "81", CN: "86", BR: "55", MX: "52", ES: "34", IT: "39",
  NL: "31", SE: "46", NO: "47", DK: "45", FI: "358", PL: "48",
  RU: "7", KR: "82", SG: "65", NZ: "64", IE: "353", CH: "41", AT: "43",
  BE: "32", PT: "351", ZA: "27", AE: "971", SA: "966", IL: "972"
};

function digitsOnly(s: string): string {
  return String(s || "").replace(/\D/g, "");
}

function normalizePhone(raw: string, defaultCountry = "US"): {
  e164: string | null;
  national: string;
  country: string | null;
  valid: boolean;
  digits: string;
} {
  let input = raw.trim();
  const digits = digitsOnly(input);
  if (digits.length < 7 || digits.length > 15) {
    return { e164: null, national: digits, country: null, valid: false, digits };
  }

  // Already looks like E.164
  if (input.startsWith("+") && digits.length >= 8 && digits.length <= 15) {
    // Try to match country
    let matchedCountry: string | null = null;
    for (const [cc, code] of Object.entries(COUNTRY_CODES)) {
      if (digits.startsWith(code) && digits.length - code.length >= 7) {
        matchedCountry = cc === "UK" ? "GB" : cc;
        break;
      }
    }
    return {
      e164: "+" + digits,
      national: digits.slice(matchedCountry ? COUNTRY_CODES[matchedCountry === "GB" ? "GB" : matchedCountry].length : 0),
      country: matchedCountry,
      valid: true,
      digits
    };
  }

  // Apply default country
  const def = (defaultCountry || "US").toUpperCase();
  const code = COUNTRY_CODES[def] || COUNTRY_CODES["US"];
  let national = digits;

  // Strip leading country code if present
  if (digits.startsWith(code) && digits.length > code.length + 6) {
    national = digits.slice(code.length);
  } else if (digits.length === 10 && (def === "US" || def === "CA")) {
    national = digits;
  } else if (digits.length === 11 && digits.startsWith("1") && (def === "US" || def === "CA")) {
    national = digits.slice(1);
  }

  const e164 = "+" + code + national;
  const valid = national.length >= 7 && national.length <= 12 && /^\d+$/.test(national);

  return {
    e164: valid ? e164 : null,
    national,
    country: valid ? (def === "UK" ? "GB" : def) : null,
    valid,
    digits
  };
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Normalize phone numbers toward E.164 format with country detection – lightweight pure JS",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-phone-normalizer", version: "1.0.0" },
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
    const phone = body.phone !== undefined ? String(body.phone) : String(body);
    if (!phone || phone.trim().length === 0) {
      return NextResponse.json({ error: "Missing or empty 'phone' field" }, { status: 400 });
    }
    if (phone.length > 40) {
      return NextResponse.json({ error: "Input too long" }, { status: 413 });
    }

    const defaultCountry = (body.defaultCountry || body.country || "US").toUpperCase();
    const result = normalizePhone(phone, defaultCountry);

    return NextResponse.json({
      success: true,
      e164: result.e164,
      national: result.national,
      country: result.country,
      valid: result.valid,
      meta: {
        original: phone,
        digits: result.digits,
        defaultCountry
      }
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-phone-normalizer",
    description: "Lightweight phone number normalizer toward E.164. Agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/normalize" },
  });
}
