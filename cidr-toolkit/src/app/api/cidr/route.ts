import { NextRequest, NextResponse } from "next/server";

/**
 * x402 CIDR Toolkit – No-human-in-loop microservice
 * Price guidance: 0.004 – 0.009 USDC per call
 *
 * Actions:
 *  - parse:     { action: "parse", cidr: "x.x.x.x/n" } → network, broadcast, hosts, first/last
 *  - contains:  { action: "contains", cidr, ip } → membership boolean
 *  - expand:    { action: "expand", cidr, limit? } → host list (capped, small prefixes only)
 *  - summarize: { action: "summarize", cidr } → compact summary
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "5000"; // ~0.005 USDC
const EXPAND_HARD_CAP = 256;

function hasValidPayment(req: NextRequest): boolean {
  // STUB: replace with real x402 / facilitator verification in production
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function ipv4ToInt(ip: string): number | null {
  const parts = String(ip || "").trim().split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return null;
    const octet = Number(p);
    if (octet < 0 || octet > 255) return null;
    n = ((n << 8) | octet) >>> 0;
  }
  return n;
}

function intToIpv4(n: number): string {
  const u = n >>> 0;
  return [(u >>> 24) & 0xff, (u >>> 16) & 0xff, (u >>> 8) & 0xff, u & 0xff].join(".");
}

type CidrInfo = {
  cidr: string;
  network: string;
  broadcast: string;
  netmask: string;
  wildcard: string;
  prefix: number;
  hostCount: number;
  usableHosts: number;
  firstUsable: string | null;
  lastUsable: string | null;
  networkInt: number;
  broadcastInt: number;
};

function parseCidr(cidr: string): { ok: true; info: CidrInfo } | { ok: false; error: string } {
  const raw = String(cidr || "").trim();
  const m = raw.match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
  if (!m) return { ok: false, error: "Invalid CIDR format. Use x.x.x.x/prefix (IPv4)" };

  const ipInt = ipv4ToInt(m[1]);
  const prefix = Number(m[2]);
  if (ipInt === null) return { ok: false, error: "Invalid IPv4 address in CIDR" };
  if (prefix < 0 || prefix > 32) return { ok: false, error: "Prefix must be 0–32" };

  const mask = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0);
  const networkInt = (ipInt & mask) >>> 0;
  const broadcastInt = (networkInt | (~mask >>> 0)) >>> 0;
  const hostCount = broadcastInt - networkInt + 1;
  const usableHosts = prefix >= 31 ? hostCount : Math.max(0, hostCount - 2);
  const firstUsable = prefix >= 31 ? intToIpv4(networkInt) : intToIpv4(networkInt + 1);
  const lastUsable = prefix >= 31 ? intToIpv4(broadcastInt) : intToIpv4(broadcastInt - 1);

  return {
    ok: true,
    info: {
      cidr: `${intToIpv4(networkInt)}/${prefix}`,
      network: intToIpv4(networkInt),
      broadcast: intToIpv4(broadcastInt),
      netmask: intToIpv4(mask),
      wildcard: intToIpv4(~mask >>> 0),
      prefix,
      hostCount,
      usableHosts,
      firstUsable,
      lastUsable,
      networkInt,
      broadcastInt,
    },
  };
}

function paymentRequired(req: NextRequest) {
  const paymentRequirements = {
    scheme: "exact",
    network: NETWORK,
    maxAmountRequired: MAX_AMOUNT,
    resource: req.url,
    description:
      "Parse IPv4 CIDR, test membership, expand small prefixes, summarize ranges. Pure arithmetic.",
    mimeType: "application/json",
    payTo: PAY_TO,
    extra: { name: "x402-cidr-toolkit", version: "1.0.0" },
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

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) return paymentRequired(req);

  try {
    const body = await req.json();
    const action = String(body.action || "").toLowerCase();
    const cidr = body.cidr;

    if (!cidr) {
      return NextResponse.json({ error: "Missing 'cidr' field" }, { status: 400 });
    }

    const parsed = parseCidr(cidr);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { info } = parsed;

    if (action === "parse" || action === "summarize") {
      const {
        networkInt: _ni,
        broadcastInt: _bi,
        ...publicInfo
      } = info;
      return NextResponse.json({
        success: true,
        result: publicInfo,
        meta: { action },
      });
    }

    if (action === "contains") {
      const ip = body.ip;
      if (!ip) {
        return NextResponse.json({ error: "Missing 'ip' field for contains" }, { status: 400 });
      }
      const ipInt = ipv4ToInt(ip);
      if (ipInt === null) {
        return NextResponse.json({ error: "Invalid IPv4 address" }, { status: 400 });
      }
      const contained = ipInt >= info.networkInt && ipInt <= info.broadcastInt;
      return NextResponse.json({
        success: true,
        result: { contained, ip: String(ip).trim(), cidr: info.cidr },
        meta: { action: "contains" },
      });
    }

    if (action === "expand") {
      const requested = Number(body.limit);
      const limit = Number.isFinite(requested)
        ? Math.min(Math.max(1, Math.floor(requested)), EXPAND_HARD_CAP)
        : Math.min(info.hostCount, EXPAND_HARD_CAP);

      if (info.hostCount > EXPAND_HARD_CAP && !body.limit) {
        return NextResponse.json(
          {
            error: `Prefix too large to expand fully (${info.hostCount} hosts). Pass limit <= ${EXPAND_HARD_CAP}, or use summarize/parse.`,
          },
          { status: 413 }
        );
      }

      const hosts: string[] = [];
      const end = Math.min(info.networkInt + limit - 1, info.broadcastInt);
      for (let i = info.networkInt; i <= end; i++) {
        hosts.push(intToIpv4(i));
      }

      return NextResponse.json({
        success: true,
        result: {
          cidr: info.cidr,
          hosts,
          returned: hosts.length,
          totalHosts: info.hostCount,
          truncated: hosts.length < info.hostCount,
        },
        meta: { action: "expand", limit },
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use parse | contains | expand | summarize" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-cidr-toolkit",
    description:
      "Parse IPv4 CIDR, test IP membership, expand small prefixes, summarize ranges. Agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/cidr" },
  });
}
