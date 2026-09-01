import { NextRequest, NextResponse } from "next/server";

/**
 * x402 Date Normalizer – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.009 USDC per call
 *
 * Accepts: { "date": string | number, "options"?: { "output": "iso"|"unix"|"date", "timezoneOffset": number } }
 * Attempts to parse common formats and return consistent ISO-8601 (or unix / Date string).
 * Returns: { "success": true, "normalized": string | number, "meta": {...} }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "7000"; // ~0.007 USDC

function hasValidPayment(req: NextRequest): boolean {
  // STUB: replace with real x402 / facilitator verification in production
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function parseLooseDate(input: string | number): Date | null {
  if (typeof input === "number") {
    // assume ms if large, else seconds
    const ms = input > 1e12 ? input : input * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  const s = String(input).trim();
  if (!s) return null;

  // Try native parse first
  let d = new Date(s);
  if (!isNaN(d.getTime())) return d;

  // Common fallbacks
  // YYYY/MM/DD or DD/MM/YYYY heuristic
  const slash = s.match(/^(\d{1,4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (slash) {
    let y = Number(slash[1]), m = Number(slash[2]), day = Number(slash[3]);
    if (y < 100) y += 2000;
    if (day > 31) { // swap if first looks like year
      // already y first
    } else if (y > 31 && day <= 31) {
      // ok
    } else if (m > 12) {
      // day/month swap
      [day, m] = [m, day];
    }
    const hh = Number(slash[4] || 0);
    const mm = Number(slash[5] || 0);
    const ss = Number(slash[6] || 0);
    d = new Date(Date.UTC(y, m - 1, day, hh, mm, ss));
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Normalize loose date strings / timestamps to ISO-8601 (or unix)",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-date-normalizer", version: "1.0.0" },
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
    const dateInput = body.date !== undefined ? body.date : body;
    if (dateInput === undefined || dateInput === null || dateInput === "") {
      return NextResponse.json({ error: "Missing 'date' field" }, { status: 400 });
    }

    const options = body.options || {};
    const output = options.output === "unix" ? "unix" : options.output === "date" ? "date" : "iso";
    const offsetMin = Number(options.timezoneOffset) || 0;

    const parsed = parseLooseDate(dateInput);
    if (!parsed) {
      return NextResponse.json({ error: "Could not parse date", input: dateInput }, { status: 400 });
    }

    // Apply simple offset if provided (minutes)
    if (offsetMin) {
      parsed.setMinutes(parsed.getMinutes() + offsetMin);
    }

    let normalized: string | number;
    if (output === "unix") {
      normalized = Math.floor(parsed.getTime() / 1000);
    } else if (output === "date") {
      normalized = parsed.toUTCString();
    } else {
      normalized = parsed.toISOString();
    }

    return NextResponse.json({
      success: true,
      normalized,
      meta: {
        original: dateInput,
        output,
        utcMs: parsed.getTime(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-date-normalizer",
    description: "Parse common date formats / timestamps into consistent ISO-8601 or unix. Deterministic.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/normalize" },
  });
}
