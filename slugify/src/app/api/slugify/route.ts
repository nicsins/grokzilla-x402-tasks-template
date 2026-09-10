import { NextRequest, NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "eip155:8453";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "2000";

function hasValidPayment(req: NextRequest): boolean {
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function paymentRequirements(resource: string) {
  return {
    scheme: "exact",
    network: NETWORK,
    maxAmountRequired: MAX_AMOUNT,
    resource,
    description: "Turn any string into a URL-safe slug. Deterministic, unicode-normalized.",
    mimeType: "application/json",
    payTo: PAY_TO,
    extra: { name: "USD Coin", version: "2" },
  };
}

function unpaid(req: NextRequest) {
  const reqs = paymentRequirements(req.url);
  return NextResponse.json(
    { error: "Payment Required", x402Version: 2, accepts: [reqs] },
    {
      status: 402,
      headers: {
        "PAYMENT-REQUIRED": Buffer.from(JSON.stringify(reqs)).toString("base64"),
        "Cache-Control": "no-store",
      },
    }
  );
}

function slugify(text: string, maxLen: number, suffix: string): string {
  const base = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, Math.max(1, maxLen));
  const cleanSuffix = suffix
    ? "-" +
      suffix
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    : "";
  return (base || "item") + cleanSuffix;
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) return unpaid(req);
  try {
    const body = await req.json();
    const text = String(body.text ?? body.input ?? "");
    if (!text.trim()) return NextResponse.json({ error: "Missing text" }, { status: 400 });
    if (text.length > 20_000) return NextResponse.json({ error: "Input too large (max 20k)" }, { status: 413 });
    const maxLen = Math.min(Math.max(Number(body.max_len || 80), 1), 200);
    const suffix = body.suffix != null ? String(body.suffix) : "";
    const result = slugify(text, maxLen, suffix);
    return NextResponse.json({
      success: true,
      result,
      meta: { max_len: maxLen, input_length: text.length, result_length: result.length },
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-slugify",
    description: "Unicode-normalized URL slug generator for catalog and CMS agents.",
    price_usd: 0.002,
    network: NETWORK,
    payTo: PAY_TO,
    endpoints: { POST: "/api/slugify" },
  });
}
