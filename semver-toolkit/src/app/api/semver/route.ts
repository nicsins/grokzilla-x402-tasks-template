import { NextRequest, NextResponse } from "next/server";

/**
 * x402 Semver Toolkit – No-human-in-loop microservice
 * Price guidance: 0.004 – 0.010 USDC per call
 *
 * Actions:
 *   parse   – { version: "1.2.3-beta.1+build" }
 *   compare – { a: "1.2.3", b: "1.3.0" } → -1 | 0 | 1
 *   bump    – { version: "1.2.3", level: "major"|"minor"|"patch"|"prerelease" }
 *   satisfies – { version: "1.2.3", range: ">=1.0.0 <2.0.0" } (basic)
 *
 * Fully deterministic, zero external deps, agent-ready.
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

interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
  build: string[];
  raw: string;
}

function parseSemVer(input: string): SemVer | null {
  const raw = String(input || "").trim().replace(/^v/i, "");
  const re =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  const m = raw.match(re);
  if (!m) return null;
  return {
    major: parseInt(m[1], 10),
    minor: parseInt(m[2], 10),
    patch: parseInt(m[3], 10),
    prerelease: m[4] ? m[4].split(".") : [],
    build: m[5] ? m[5].split(".") : [],
    raw,
  };
}

function compareIdentifiers(a: string, b: string): number {
  const an = /^\d+$/.test(a);
  const bn = /^\d+$/.test(b);
  if (an && bn) {
    const diff = parseInt(a, 10) - parseInt(b, 10);
    return diff === 0 ? 0 : diff > 0 ? 1 : -1;
  }
  if (an) return -1;
  if (bn) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareSemVer(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major > b.major ? 1 : -1;
  if (a.minor !== b.minor) return a.minor > b.minor ? 1 : -1;
  if (a.patch !== b.patch) return a.patch > b.patch ? 1 : -1;
  if (a.prerelease.length === 0 && b.prerelease.length === 0) return 0;
  if (a.prerelease.length === 0) return 1;
  if (b.prerelease.length === 0) return -1;
  const len = Math.max(a.prerelease.length, b.prerelease.length);
  for (let i = 0; i < len; i++) {
    if (i >= a.prerelease.length) return -1;
    if (i >= b.prerelease.length) return 1;
    const c = compareIdentifiers(a.prerelease[i], b.prerelease[i]);
    if (c !== 0) return c;
  }
  return 0;
}

function bump(v: SemVer, level: string): string {
  let { major, minor, patch, prerelease } = v;
  switch (level) {
    case "major":
      major += 1; minor = 0; patch = 0; prerelease = []; break;
    case "minor":
      minor += 1; patch = 0; prerelease = []; break;
    case "patch":
      patch += 1; prerelease = []; break;
    case "prerelease":
      if (prerelease.length === 0) prerelease = ["0"];
      else {
        const last = prerelease[prerelease.length - 1];
        if (/^\d+$/.test(last)) prerelease = [...prerelease.slice(0, -1), String(parseInt(last, 10) + 1)];
        else prerelease = [...prerelease, "0"];
      }
      break;
    default:
      patch += 1; prerelease = [];
  }
  let out = `${major}.${minor}.${patch}`;
  if (prerelease.length) out += `-${prerelease.join(".")}`;
  return out;
}

function basicSatisfies(version: string, range: string): boolean {
  const v = parseSemVer(version);
  if (!v) return false;
  const parts = range.trim().split(/\s+/);
  for (const p of parts) {
    if (p.startsWith(">=")) {
      const other = parseSemVer(p.slice(2));
      if (!other || compareSemVer(v, other) < 0) return false;
    } else if (p.startsWith(">")) {
      const other = parseSemVer(p.slice(1));
      if (!other || compareSemVer(v, other) <= 0) return false;
    } else if (p.startsWith("<=")) {
      const other = parseSemVer(p.slice(2));
      if (!other || compareSemVer(v, other) > 0) return false;
    } else if (p.startsWith("<")) {
      const other = parseSemVer(p.slice(1));
      if (!other || compareSemVer(v, other) >= 0) return false;
    } else if (p.startsWith("=") || /^\d/.test(p)) {
      const other = parseSemVer(p.replace(/^=/, ""));
      if (!other || compareSemVer(v, other) !== 0) return false;
    }
  }
  return true;
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description:
        "Parse, compare, bump or test semantic versions (semver). Deterministic agent utility for package & release workflows.",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-semver-toolkit", version: "1.0.0" },
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

    if (action === "parse") {
      const version = body.version || body.v || body.input;
      const parsed = parseSemVer(version);
      if (!parsed) return NextResponse.json({ error: "Invalid semver", input: version }, { status: 400 });
      return NextResponse.json({ success: true, result: parsed, meta: { action: "parse" } });
    }

    if (action === "compare") {
      const a = parseSemVer(body.a || body.left || body.versionA);
      const b = parseSemVer(body.b || body.right || body.versionB);
      if (!a || !b) return NextResponse.json({ error: "Both a and b must be valid semver" }, { status: 400 });
      const cmp = compareSemVer(a, b);
      return NextResponse.json({
        success: true,
        result: cmp,
        meta: { action: "compare", meaning: cmp < 0 ? "a < b" : cmp > 0 ? "a > b" : "a == b" },
      });
    }

    if (action === "bump") {
      const version = body.version || body.v;
      const level = (body.level || body.part || "patch").toLowerCase();
      const parsed = parseSemVer(version);
      if (!parsed) return NextResponse.json({ error: "Invalid semver", input: version }, { status: 400 });
      const next = bump(parsed, level);
      return NextResponse.json({
        success: true,
        result: next,
        meta: { action: "bump", level, from: parsed.raw },
      });
    }

    if (action === "satisfies") {
      const version = body.version || body.v;
      const range = body.range || body.constraint || "";
      const ok = basicSatisfies(version, range);
      return NextResponse.json({
        success: true,
        result: ok,
        meta: { action: "satisfies", version, range },
      });
    }

    return NextResponse.json(
      { error: "Unknown action. Use parse | compare | bump | satisfies" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-semver-toolkit",
    description: "Parse, compare, bump and test semantic versions. Agent-ready, deterministic.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/semver" },
  });
}
