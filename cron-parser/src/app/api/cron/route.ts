import { NextRequest, NextResponse } from "next/server";

/**
 * x402 Cron Parser – No-human-in-loop microservice
 * Price guidance: 0.004 – 0.012 USDC per call
 *
 * Actions:
 *   parse   – { expression: "0 9 * * 1-5" } → structured fields + human
 *   next    – { expression, from?: ISO, count?: number } → next N run times (UTC)
 *   human   – { expression } → human-readable description
 *
 * Supports standard 5-field cron (minute hour day-of-month month day-of-week).
 * Deterministic, pure JS, agent-ready.
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

type Field = number[];

function expandField(field: string, min: number, max: number): Field | null {
  if (field === "*") {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }
  const out: number[] = [];
  for (const part of field.split(",")) {
    if (part.includes("/")) {
      const [range, stepStr] = part.split("/");
      const step = parseInt(stepStr, 10);
      if (isNaN(step) || step < 1) return null;
      let start = min,
        end = max;
      if (range !== "*") {
        if (range.includes("-")) {
          const [s, e] = range.split("-").map((x) => parseInt(x, 10));
          if (isNaN(s) || isNaN(e)) return null;
          start = s;
          end = e;
        } else {
          start = parseInt(range, 10);
          if (isNaN(start)) return null;
        }
      }
      for (let i = start; i <= end; i += step) out.push(i);
    } else if (part.includes("-")) {
      const [s, e] = part.split("-").map((x) => parseInt(x, 10));
      if (isNaN(s) || isNaN(e) || s > e) return null;
      for (let i = s; i <= e; i++) out.push(i);
    } else {
      const n = parseInt(part, 10);
      if (isNaN(n)) return null;
      out.push(n);
    }
  }
  const filtered = [...new Set(out)].filter((n) => n >= min && n <= max).sort((a, b) => a - b);
  return filtered.length ? filtered : null;
}

interface ParsedCron {
  minute: Field;
  hour: Field;
  dom: Field;
  month: Field;
  dow: Field;
  raw: string;
}

function parseCron(expr: string): ParsedCron | null {
  const parts = String(expr || "")
    .trim()
    .split(/\s+/);
  if (parts.length !== 5) return null;
  const [mi, h, dom, mon, dow] = parts;
  const minute = expandField(mi, 0, 59);
  const hour = expandField(h, 0, 23);
  const dayOfMonth = expandField(dom, 1, 31);
  const month = expandField(mon, 1, 12);
  const dayOfWeek = expandField(dow, 0, 6); // 0=Sun
  if (!minute || !hour || !dayOfMonth || !month || !dayOfWeek) return null;
  return { minute, hour, dom: dayOfMonth, month, dow: dayOfWeek, raw: expr.trim() };
}

function humanize(p: ParsedCron): string {
  const fmt = (f: Field, names?: string[]) => {
    if (f.length <= 3) return f.map((n) => (names ? names[n] || n : n)).join(",");
    return `${f[0]}-${f[f.length - 1]} (${f.length} values)`;
  };
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `At minute(s) ${fmt(p.minute)} of hour(s) ${fmt(p.hour)}, on day-of-month ${fmt(p.dom)}, in month(s) ${fmt(p.month, months)}, on ${fmt(p.dow, days)}`;
}

function matches(d: Date, p: ParsedCron): boolean {
  return (
    p.minute.includes(d.getUTCMinutes()) &&
    p.hour.includes(d.getUTCHours()) &&
    p.dom.includes(d.getUTCDate()) &&
    p.month.includes(d.getUTCMonth() + 1) &&
    p.dow.includes(d.getUTCDay())
  );
}

function nextRuns(p: ParsedCron, from: Date, count: number): string[] {
  const results: string[] = [];
  const cursor = new Date(from.getTime());
  cursor.setUTCSeconds(0, 0);
  cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  const maxIter = 2 * 365 * 24 * 60;
  let iter = 0;
  while (results.length < count && iter < maxIter) {
    if (matches(cursor, p)) {
      results.push(cursor.toISOString());
    }
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
    iter++;
  }
  return results;
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description:
        "Parse standard 5-field cron expressions, get human description or next N run times (UTC). Deterministic agent scheduler utility.",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-cron-parser", version: "1.0.0" },
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
    const action = (body.action || body.mode || "parse").toLowerCase();
    const expression = body.expression || body.cron || body.expr || body.input;

    const parsed = parseCron(expression);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid cron expression. Expected 5 fields: minute hour day-of-month month day-of-week" },
        { status: 400 }
      );
    }

    if (action === "parse") {
      return NextResponse.json({
        success: true,
        result: {
          minute: parsed.minute,
          hour: parsed.hour,
          dayOfMonth: parsed.dom,
          month: parsed.month,
          dayOfWeek: parsed.dow,
          raw: parsed.raw,
        },
        meta: { action: "parse", human: humanize(parsed) },
      });
    }

    if (action === "human") {
      return NextResponse.json({
        success: true,
        result: humanize(parsed),
        meta: { action: "human", raw: parsed.raw },
      });
    }

    if (action === "next") {
      const from = body.from ? new Date(body.from) : new Date();
      if (isNaN(from.getTime())) {
        return NextResponse.json({ error: "Invalid from timestamp" }, { status: 400 });
      }
      const count = Math.min(Math.max(parseInt(body.count || "5", 10) || 5, 1), 20);
      const runs = nextRuns(parsed, from, count);
      return NextResponse.json({
        success: true,
        result: runs,
        meta: { action: "next", from: from.toISOString(), count: runs.length, timezone: "UTC" },
      });
    }

    return NextResponse.json(
      { error: "Unknown action. Use parse | human | next" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-cron-parser",
    description: "Parse cron expressions, humanize, and compute next run times (UTC). Agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/cron" },
  });
}
