import { NextRequest, NextResponse } from "next/server";

/**
 * x402 IP Toolkit – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.009 USDC per call
 *
 * Actions (IPv4 focused for determinism & edge size):
 *   validate  – { ip: "192.168.1.1" } → true/false + normalized
 *   normalize – { ip }
 *   isPrivate – { ip }
 *   cidrContains – { ip, cidr: "10.0.0.0/8" }
 *   toInt / fromInt
 *
 * Pure deterministic, no external calls, agent-ready.
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "6000"; // ~0.006 USDC

function hasValidPayment(req: NextRequest): boolean {
  // STUB: replace with real x402 / facilitator verification in production
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function parseIPv4(ip: string): number[] | null {
  const parts = String(ip || "").trim().split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => parseInt(p, 10));
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return null;
  return nums;
}

function toInt(octets: number[]): number {
  return ((octets[0] << 24) >>> 0) + (octets[1] << 16) + (octets[2] << 8) + octets[3];
}

function fromInt(n: number): string {
  const x = n >>> 0;
  return [(x >>> 24) & 255, (x >>> 16) & 255, (x >>> 8) & 255, x & 255].join(".");
}

function isPrivate(octets: number[]): boolean {
  const a = octets[0],
    b = octets[1];
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function parseCIDR(cidr: string): { network: number; mask: number } | null {
  const [ipPart, prefixStr] = String(cidr || "").trim().split("/");
  const octets = parseIPv4(ipPart);
  if (!octets) return null;
  const prefix = parseInt(prefixStr, 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return null;
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const network = toInt(octets) & mask;
  return { network, mask };
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description:
        "IPv4 validate, normalize, isPrivate, CIDR contains, int conversion. Deterministic network utility for agents.",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-ip-toolkit", version: "1.0.0" },
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
    const action = (body.action || body.mode || "validate").toLowerCase();
    const ip = body.ip || body.address || body.input;

    if (action === "validate" || action === "normalize") {
      const octets = parseIPv4(ip);
      if (!octets) {
        return NextResponse.json({ success: true, result: false, meta: { action, valid: false } });
      }
      const normalized = octets.join(".");
      return NextResponse.json({
        success: true,
        result: action === "validate" ? true : normalized,
        meta: { action, valid: true, normalized, octets },
      });
    }

    if (action === "isprivate" || action === "is_private") {
      const octets = parseIPv4(ip);
      if (!octets) {
        return NextResponse.json({ error: "Invalid IPv4" }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        result: isPrivate(octets),
        meta: { action: "isPrivate", ip: octets.join(".") },
      });
    }

    if (action === "cidrcontains" || action === "cidr_contains" || action === "contains") {
      const cidr = body.cidr || body.network || body.range;
      const octets = parseIPv4(ip);
      const parsed = parseCIDR(cidr);
      if (!octets || !parsed) {
        return NextResponse.json({ error: "Invalid ip or cidr" }, { status: 400 });
      }
      const ipInt = toInt(octets);
      const contains = (ipInt & parsed.mask) === parsed.network;
      return NextResponse.json({
        success: true,
        result: contains,
        meta: { action: "cidrContains", ip: octets.join("."), cidr },
      });
    }

    if (action === "toint" || action === "to_int") {
      const octets = parseIPv4(ip);
      if (!octets) return NextResponse.json({ error: "Invalid IPv4" }, { status: 400 });
      return NextResponse.json({
        success: true,
        result: toInt(octets),
        meta: { action: "toInt", ip: octets.join(".") },
      });
    }

    if (action === "fromint" || action === "from_int") {
      const n = Number(body.int ?? body.n ?? body.value);
      if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) {
        return NextResponse.json({ error: "int must be 0..4294967295" }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        result: fromInt(n),
        meta: { action: "fromInt", int: n },
      });
    }

    return NextResponse.json(
      {
        error:
          "Unknown action. Use validate | normalize | isPrivate | cidrContains | toInt | fromInt",
      },
      { status: 400 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-ip-toolkit",
    description: "IPv4 validation, normalization, private check, CIDR membership, int conversion. Agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/ip" },
  });
}
