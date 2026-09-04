import { NextRequest, NextResponse } from "next/server";

/**
 * x402 Duration Parser – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.009 USDC per call
 *
 * Accepts:
 *   { "action": "parse", "duration": "2h 30m" | "1d4h" | "90s" ... }
 *   { "action": "humanize", "seconds": number }
 * Returns: { "success": true, "seconds"?: number, "iso"?: string, "human"?: string, "meta": {...} }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "6500"; // ~0.0065 USDC

function hasValidPayment(req: NextRequest): boolean {
  // STUB: replace with real x402 / facilitator verification in production
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

const UNIT_SECONDS: Record<string, number> = {
  ms: 0.001,
  s: 1,
  sec: 1,
  secs: 1,
  second: 1,
  seconds: 1,
  m: 60,
  min: 60,
  mins: 60,
  minute: 60,
  minutes: 60,
  h: 3600,
  hr: 3600,
  hrs: 3600,
  hour: 3600,
  hours: 3600,
  d: 86400,
  day: 86400,
  days: 86400,
  w: 604800,
  week: 604800,
  weeks: 604800,
};

function parseDuration(str: string): number {
  const cleaned = String(str || "").trim().toLowerCase();
  if (!cleaned) return 0;

  // pure number → assume seconds
  if (/^\d+(\.\d+)?$/.test(cleaned)) {
    return parseFloat(cleaned);
  }

  let total = 0;
  const re = /(\d+(?:\.\d+)?)\s*([a-z]+)/g;
  let match;
  let found = false;
  while ((match = re.exec(cleaned)) !== null) {
    found = true;
    const val = parseFloat(match[1]);
    const unit = match[2];
    const mult = UNIT_SECONDS[unit];
    if (mult === undefined) {
      throw new Error(`Unknown unit: ${unit}`);
    }
    total += val * mult;
  }
  if (!found) {
    throw new Error("Could not parse duration string");
  }
  return total;
}

function humanize(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0s";
  const parts: string[] = [];
  let rem = Math.floor(seconds);

  const weeks = Math.floor(rem / 604800);
  if (weeks) {
    parts.push(`${weeks}w`);
    rem %= 604800;
  }
  const days = Math.floor(rem / 86400);
  if (days) {
    parts.push(`${days}d`);
    rem %= 86400;
  }
  const hours = Math.floor(rem / 3600);
  if (hours) {
    parts.push(`${hours}h`);
    rem %= 3600;
  }
  const mins = Math.floor(rem / 60);
  if (mins) {
    parts.push(`${mins}m`);
    rem %= 60;
  }
  if (rem || parts.length === 0) {
    parts.push(`${rem}s`);
  }
  return parts.join(" ");
}

function toIsoDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "PT0S";
  let rem = Math.floor(seconds);
  const days = Math.floor(rem / 86400);
  rem %= 86400;
  const hours = Math.floor(rem / 3600);
  rem %= 3600;
  const mins = Math.floor(rem / 60);
  const secs = rem % 60;

  let iso = "P";
  if (days) iso += `${days}D`;
  iso += "T";
  if (hours) iso += `${hours}H`;
  if (mins) iso += `${mins}M`;
  iso += `${secs}S`;
  return iso;
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Parse human duration strings to seconds/ISO or humanize seconds. Deterministic agent utility.",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-duration-parser", version: "1.0.0" },
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
    const action = (body.action || "parse").toLowerCase();

    if (action === "parse") {
      const duration = body.duration !== undefined ? String(body.duration) : String(body.input || body.text || "");
      if (!duration.trim()) {
        return NextResponse.json({ error: "Missing or empty 'duration' field" }, { status: 400 });
      }
      try {
        const seconds = parseDuration(duration);
        return NextResponse.json({
          success: true,
          seconds,
          iso: toIsoDuration(seconds),
          human: humanize(seconds),
          meta: { action: "parse", input: duration },
        });
      } catch (e: any) {
        return NextResponse.json({ error: e.message || "Parse failed" }, { status: 400 });
      }
    }

    if (action === "humanize") {
      const sec = Number(body.seconds ?? body.value ?? body.input);
      if (!Number.isFinite(sec)) {
        return NextResponse.json({ error: "Missing or invalid 'seconds' number" }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        seconds: sec,
        human: humanize(sec),
        iso: toIsoDuration(sec),
        meta: { action: "humanize" },
      });
    }

    return NextResponse.json(
      { error: "Invalid 'action'. Allowed: parse | humanize" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-duration-parser",
    description: "Parse human durations (2h30m, 1d4h, 90s) to seconds/ISO or humanize. Agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/parse" },
  });
}
