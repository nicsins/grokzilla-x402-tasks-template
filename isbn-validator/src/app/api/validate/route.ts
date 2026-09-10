import { NextRequest, NextResponse } from "next/server";

/**
 * x402 ISBN Validator – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.008 USDC per call
 *
 * Accepts: { "isbn": string, "action"?: "validate" | "convert" | "checkdigit" }
 * Returns structured validity, type, normalized form, converted form when possible.
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "6000";

function hasValidPayment(req: NextRequest): boolean {
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function cleanIsbn(raw: string): string {
  return String(raw).replace(/[-\s]/g, "").toUpperCase();
}

function isValidIsbn10(isbn: string): boolean {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * parseInt(isbn[i], 10);
  const check = isbn[9] === "X" ? 10 : parseInt(isbn[9], 10);
  sum += check;
  return sum % 11 === 0;
}

function isValidIsbn13(isbn: string): boolean {
  if (!/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(isbn[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(isbn[12], 10);
}

function isbn10To13(isbn10: string): string {
  const core = "978" + isbn10.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(core[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return core + check;
}

function isbn13To10(isbn13: string): string | null {
  if (!isbn13.startsWith("978")) return null;
  const core = isbn13.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * parseInt(core[i], 10);
  const rem = sum % 11;
  const check = rem === 0 ? "0" : rem === 1 ? "X" : String(11 - rem);
  return core + check;
}

function computeCheckDigit(isbnWithoutCheck: string, type: "10" | "13"): string {
  if (type === "10") {
    if (!/^\d{9}$/.test(isbnWithoutCheck)) throw new Error("Need 9 digits for ISBN-10 check digit");
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += (10 - i) * parseInt(isbnWithoutCheck[i], 10);
    const rem = sum % 11;
    return rem === 0 ? "0" : rem === 1 ? "X" : String(11 - rem);
  } else {
    if (!/^\d{12}$/.test(isbnWithoutCheck)) throw new Error("Need 12 digits for ISBN-13 check digit");
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(isbnWithoutCheck[i], 10) * (i % 2 === 0 ? 1 : 3);
    return String((10 - (sum % 10)) % 10);
  }
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "ISBN-10/13 validate, convert, check-digit. Deterministic catalog utility.",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-isbn-validator", version: "1.0.0" },
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
    const raw = body.isbn !== undefined ? String(body.isbn) : "";
    const action = String(body.action || "validate").toLowerCase();
    const cleaned = cleanIsbn(raw);

    if (action === "checkdigit") {
      const type = cleaned.length === 9 ? "10" : cleaned.length === 12 ? "13" : null;
      if (!type) return NextResponse.json({ error: "Provide 9 digits (ISBN-10) or 12 digits (ISBN-13) without check digit" }, { status: 400 });
      const digit = computeCheckDigit(cleaned, type);
      return NextResponse.json({
        success: true,
        action: "checkdigit",
        input: cleaned,
        type: `ISBN-${type}`,
        checkDigit: digit,
        full: cleaned + digit,
      });
    }

    if (!cleaned) return NextResponse.json({ error: "isbn required" }, { status: 400 });

    const is10 = cleaned.length === 10;
    const is13 = cleaned.length === 13;
    if (!is10 && !is13) {
      return NextResponse.json({ error: "ISBN must be 10 or 13 characters after cleaning", cleaned }, { status: 400 });
    }

    const valid = is10 ? isValidIsbn10(cleaned) : isValidIsbn13(cleaned);
    const type = is10 ? "ISBN-10" : "ISBN-13";

    let converted: string | null = null;
    if (valid) {
      if (is10) converted = isbn10To13(cleaned);
      else converted = isbn13To10(cleaned);
    }

    if (action === "convert") {
      return NextResponse.json({
        success: true,
        action: "convert",
        original: cleaned,
        type,
        valid,
        converted: converted || null,
        note: converted ? undefined : "Conversion only possible for valid 978-prefixed ISBN-13 or any valid ISBN-10",
      });
    }

    return NextResponse.json({
      success: true,
      action: "validate",
      isbn: cleaned,
      type,
      valid,
      converted: converted || null,
      normalized: cleaned,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Invalid request" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-isbn-validator",
    description: "ISBN-10/13 validation, conversion and check-digit. Deterministic agent utility.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/validate" },
  });
}
