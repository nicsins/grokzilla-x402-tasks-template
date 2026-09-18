import { NextRequest, NextResponse } from "next/server";

/**
 * x402 URL Canonicalizer – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.008 USDC per call
 *
 * Input:  { url: string, options?: { removeFragment?: boolean, trailingSlash?: "keep"|"remove"|"add", lowercasePath?: boolean } }
 * Output: { success, original, canonical, components }
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

function canonicalizeUrl(raw: string, options: {
  removeFragment?: boolean;
  trailingSlash?: "keep" | "remove" | "add";
  lowercasePath?: boolean;
} = {}): { canonical: string; components: Record<string, any> } {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    // try with https if protocol missing
    u = new URL(raw.startsWith("//") ? "https:" + raw : "https://" + raw);
  }

  const protocol = u.protocol.toLowerCase();
  const host = u.hostname.toLowerCase();
  let port = u.port;
  if ((protocol === "https:" && port === "443") || (protocol === "http:" && port === "80")) {
    port = "";
  }

  let pathname = u.pathname || "/";
  if (options.lowercasePath) pathname = pathname.toLowerCase();
  // collapse multiple slashes
  pathname = pathname.replace(/\/{2,}/g, "/");
  if (options.trailingSlash === "remove" && pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  } else if (options.trailingSlash === "add" && !pathname.endsWith("/")) {
    pathname = pathname + "/";
  }

  // sort query params deterministically
  const params = new URLSearchParams(u.search);
  const sorted = new URLSearchParams();
  Array.from(params.keys()).sort().forEach((k) => {
    const values = params.getAll(k).sort();
    values.forEach((v) => sorted.append(k, v));
  });
  const search = sorted.toString() ? "?" + sorted.toString() : "";

  const hash = options.removeFragment !== false ? "" : u.hash;

  const authority = port ? `${host}:${port}` : host;
  const canonical = `${protocol}//${authority}${pathname}${search}${hash}`;

  return {
    canonical,
    components: {
      protocol,
      host,
      port: port || null,
      pathname,
      search: search || null,
      hash: hash || null,
    },
  };
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Deterministic URL canonicalization for cache keys, dedup, and agent resource identity.",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-url-canonicalizer", version: "1.0.0" },
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
    const url = body.url;
    if (typeof url !== "string" || !url.trim()) {
      return NextResponse.json({ error: "url (string) is required" }, { status: 400 });
    }
    const options = body.options || {};
    const result = canonicalizeUrl(url.trim(), options);
    return NextResponse.json({
      success: true,
      original: url,
      canonical: result.canonical,
      components: result.components,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Invalid URL or request" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-url-canonicalizer",
    description: "Deterministic URL canonicalization. Agent-ready utility for cache keys and resource identity.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/canonicalize" },
  });
}
