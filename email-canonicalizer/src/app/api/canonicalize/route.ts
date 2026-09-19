import { NextRequest, NextResponse } from "next/server";

/**
 * x402 Email Canonicalizer – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.007 USDC per call
 *
 * Actions (via body):
 *   canonicalize { email, removePlusTag?, removeDots?, lowercase? }
 *   validate     { email }  (basic structure only)
 *   batch        { emails: string[] }
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

function basicValidate(email: string): { valid: boolean; reason?: string } {
  if (typeof email !== "string" || !email.trim()) {
    return { valid: false, reason: "empty or not a string" };
  }
  const trimmed = email.trim();
  if (trimmed.length > 254) return { valid: false, reason: "too long" };
  const at = trimmed.lastIndexOf("@");
  if (at < 1 || at === trimmed.length - 1) return { valid: false, reason: "missing local or domain" };
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (local.length > 64) return { valid: false, reason: "local part too long" };
  if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) {
    return { valid: false, reason: "invalid characters in local part" };
  }
  if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
    return { valid: false, reason: "invalid domain" };
  }
  return { valid: true };
}

function canonicalize(
  email: string,
  opts: { removePlusTag?: boolean; removeDots?: boolean; lowercase?: boolean } = {}
): string {
  const { removePlusTag = true, removeDots = true, lowercase = true } = opts;
  let e = email.trim();
  if (lowercase) e = e.toLowerCase();

  const at = e.lastIndexOf("@");
  if (at === -1) return e;

  let local = e.slice(0, at);
  let domain = e.slice(at + 1);

  // Gmail / Googlemail style: ignore dots and anything after +
  const isGmail =
    domain === "gmail.com" ||
    domain === "googlemail.com" ||
    domain.endsWith(".gmail.com");

  if (removePlusTag) {
    const plus = local.indexOf("+");
    if (plus !== -1) local = local.slice(0, plus);
  }

  if (removeDots && (isGmail || opts.removeDots === true)) {
    local = local.replace(/\./g, "");
  }

  // Normalize googlemail → gmail
  if (domain === "googlemail.com") domain = "gmail.com";

  return `${local}@${domain}`;
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Email canonicalization for deduplication. Lowercase, +tag strip, Gmail-dot removal, domain normalize.",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-email-canonicalizer", version: "1.0.0" },
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
    const action = String(body.action || "canonicalize").toLowerCase();

    if (action === "validate") {
      const email = String(body.email || "");
      const result = basicValidate(email);
      return NextResponse.json({ success: true, action: "validate", email, ...result });
    }

    if (action === "batch") {
      const emails: string[] = Array.isArray(body.emails) ? body.emails : [];
      if (emails.length > 50) {
        return NextResponse.json({ error: "Max 50 emails per batch" }, { status: 400 });
      }
      const results = emails.map((e) => {
        const original = String(e || "");
        const check = basicValidate(original);
        if (!check.valid) return { original, valid: false, reason: check.reason };
        return {
          original,
          canonical: canonicalize(original, body.options || {}),
          valid: true,
        };
      });
      return NextResponse.json({ success: true, action: "batch", count: results.length, results });
    }

    // default: canonicalize
    const email = String(body.email || "");
    const check = basicValidate(email);
    if (!check.valid) {
      return NextResponse.json(
        { success: false, action: "canonicalize", valid: false, reason: check.reason },
        { status: 400 }
      );
    }
    const canonical = canonicalize(email, body.options || {});
    return NextResponse.json({
      success: true,
      action: "canonicalize",
      original: email.trim(),
      canonical,
      valid: true,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Invalid request" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-email-canonicalizer",
    description: "Normalize emails for deduplication. Gmail-aware +tag and dot stripping, lowercase, domain cleanup.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/canonicalize" },
  });
}
