import { NextRequest, NextResponse } from "next/server";

/**
 * x402 E.164 Phone Normalizer – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.009 USDC per call
 *
 * Accepts: { "phone": string, "defaultCountry"?: "US"|"GB"|... }
 * Returns structured E.164 + country + validity
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "6000"; // ~0.006 USDC

// Minimal common country dial codes + expected national length ranges
const COUNTRY_RULES: Record<string, { code: string; min: number; max: number }> = {
  US: { code: "1", min: 10, max: 10 },
  CA: { code: "1", min: 10, max: 10 },
  GB: { code: "44", min: 10, max: 10 },
  DE: { code: "49", min: 10, max: 12 },
  FR: { code: "33", min: 9, max: 9 },
  IN: { code: "91", min: 10, max: 10 },
  AU: { code: "61", min: 9, max: 9 },
  BR: { code: "55", min: 10, max: 11 },
  JP: { code: "81", min: 9, max: 10 },
  CN: { code: "86", min: 11, max: 11 },
  MX: { code: "52", min: 10, max: 10 },
  ES: { code: "34", min: 9, max: 9 },
  IT: { code: "39", min: 9, max: 10 },
  NL: { code: "31", min: 9, max: 9 },
  SE: { code: "46", min: 7, max: 9 },
  CH: { code: "41", min: 9, max: 9 },
  SG: { code: "65", min: 8, max: 8 },
  AE: { code: "971", min: 9, max: 9 },
  ZA: { code: "27", min: 9, max: 9 },
  NG: { code: "234", min: 10, max: 10 },
};

function hasValidPayment(req: NextRequest): boolean {
  // STUB: replace with real x402 / facilitator verification in production
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function digitsOnly(s: string): string {
  return String(s || "").replace(/\D/g, "");
}

function normalizePhone(raw: string, defaultCountry?: string) {
  let digits = digitsOnly(raw);
  if (!digits) {
    return { valid: false, error: "No digits found", e164: null, country: null, national: null };
  }

  // Already international with +
  if (raw.trim().startsWith("+")) {
    // try longest matching country code first
    const sorted = Object.entries(COUNTRY_RULES).sort((a, b) => b[1].code.length - a[1].code.length);
    for (const [iso, rule] of sorted) {
      if (digits.startsWith(rule.code)) {
        const national = digits.slice(rule.code.length);
        const valid = national.length >= rule.min && national.length <= rule.max;
        return {
          valid,
          e164: `+${rule.code}${national}`,
          country: iso,
          national,
          dialCode: rule.code,
        };
      }
    }
    // unknown country but has +
    return {
      valid: digits.length >= 8 && digits.length <= 15,
      e164: `+${digits}`,
      country: null,
      national: digits,
      dialCode: null,
    };
  }

  // No + → apply defaultCountry if provided
  const iso = (defaultCountry || "US").toUpperCase();
  const rule = COUNTRY_RULES[iso];
  if (rule) {
    // strip leading 0 common in national formats
    if (digits.startsWith("0")) digits = digits.slice(1);
    // if already starts with country code, keep
    if (digits.startsWith(rule.code) && digits.length > rule.max) {
      const national = digits.slice(rule.code.length);
      const valid = national.length >= rule.min && national.length <= rule.max;
      return { valid, e164: `+${rule.code}${national}`, country: iso, national, dialCode: rule.code };
    }
    const valid = digits.length >= rule.min && digits.length <= rule.max;
    return {
      valid,
      e164: `+${rule.code}${digits}`,
      country: iso,
      national: digits,
      dialCode: rule.code,
    };
  }

  // fallback
  return {
    valid: digits.length >= 8 && digits.length <= 15,
    e164: `+${digits}`,
    country: null,
    national: digits,
    dialCode: null,
  };
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Normalize phone numbers to E.164. Country detection + validation. Deterministic rules.",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-e164-normalizer", version: "1.0.0" },
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
    if (phone.length > 50) {
      return NextResponse.json({ error: "Input too long" }, { status: 413 });
    }

    const result = normalizePhone(phone, body.defaultCountry);

    return NextResponse.json({
      success: true,
      result,
      meta: {
        original: phone,
        defaultCountry: body.defaultCountry || null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-e164-normalizer",
    description: "Normalize phone numbers to E.164 format. Agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/normalize" },
  });
}
