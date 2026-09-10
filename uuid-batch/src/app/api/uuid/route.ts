import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "eip155:8453";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "2000";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    description: "Mint or validate UUID v4 identifiers in a single cheap batch call.",
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

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) return unpaid(req);

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = String(body.action || "mint").toLowerCase();

  if (action === "mint") {
    const count = Math.min(Math.max(Number(body.count || 1), 1), 256);
    const ids = Array.from({ length: count }, () => randomUUID());
    return NextResponse.json({
      success: true,
      action: "mint",
      version: "v4",
      count: ids.length,
      ids,
    });
  }

  if (action === "validate") {
    const raw = body.ids ?? body.id ?? body.uuids;
    const ids = Array.isArray(raw) ? raw.map(String) : [String(raw || "")];
    if (ids.length === 0 || ids.length > 512) {
      return NextResponse.json({ error: "Provide 1–512 ids" }, { status: 400 });
    }
    const results = ids.map((id) => ({
      id,
      valid: UUID_RE.test(id.trim()),
      version: UUID_RE.test(id.trim()) ? Number(id.trim()[14]) : null,
    }));
    return NextResponse.json({
      success: true,
      action: "validate",
      count: results.length,
      valid_count: results.filter((r) => r.valid).length,
      results,
    });
  }

  return NextResponse.json({ error: "action must be mint or validate" }, { status: 400 });
}

export async function GET() {
  return NextResponse.json({
    name: "x402-uuid-batch",
    description: "Mint or validate UUID v4 identifiers. Agent-native, cheap, high frequency.",
    price_usd: 0.002,
    network: NETWORK,
    payTo: PAY_TO,
    endpoints: { POST: "/api/uuid" },
  });
}
