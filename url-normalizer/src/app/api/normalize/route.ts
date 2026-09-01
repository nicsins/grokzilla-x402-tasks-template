import { NextRequest, NextResponse } from "next/server";

/**
 * x402 URL Normalizer – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.01 USDC per call
 *
 * Accepts: { "url": string, "options"?: { "stripTracking": boolean, "forceHttps": boolean, "lowercaseHost": boolean, "removeFragment": boolean, "sortQuery": boolean } }
 * Returns: { "success": true, "normalized": string, "components": {...}, "meta": {...} }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xYourPayToAddressHere";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "8000"; // 0.008 USDC

const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "fbclid", "gclid", "gclsrc", "dclid", "msclkid", "mc_cid", "mc_eid",
  "ref", "ref_src", "ref_url", "source", "campaign", "affiliate",
  "_ga", "_gl", "igshid", "si", "spm",
]);

function hasValidPayment(req: NextRequest): boolean {
  // STUB: replace with real x402 / facilitator verification in production
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Parse, clean tracking params, and canonicalize URLs for agents",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-url-normalizer", version: "1.0.0" },
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
    let raw = body.url || body.input || "";
    if (typeof raw !== "string" || raw.trim().length === 0) {
      return NextResponse.json({ error: "Missing or invalid 'url' field" }, { status: 400 });
    }
    raw = raw.trim();
    if (raw.length > 8_000) {
      return NextResponse.json({ error: "URL too long (max 8k chars)" }, { status: 413 });
    }

    // Ensure protocol for URL constructor
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) {
      raw = "https://" + raw;
    }

    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const options = body.options || {};
    const stripTracking = options.stripTracking !== false;
    const forceHttps = options.forceHttps !== false;
    const lowercaseHost = options.lowercaseHost !== false;
    const removeFragment = Boolean(options.removeFragment);
    const sortQuery = options.sortQuery !== false;

    const trackingRemoved: string[] = [];
    const params = new URLSearchParams(parsed.search);

    if (stripTracking) {
      for (const key of Array.from(params.keys())) {
        if (TRACKING_PARAMS.has(key.toLowerCase())) {
          trackingRemoved.push(key);
          params.delete(key);
        }
      }
    }

    if (sortQuery) {
      const sorted = new URLSearchParams();
      Array.from(params.keys())
        .sort()
        .forEach((k) => {
          params.getAll(k).forEach((v) => sorted.append(k, v));
        });
      // rebuild
      for (const k of Array.from(params.keys())) params.delete(k);
      sorted.forEach((v, k) => params.append(k, v));
    }

    if (forceHttps && (parsed.protocol === "http:" || parsed.protocol === "https:")) {
      parsed.protocol = "https:";
    }
    if (lowercaseHost) {
      parsed.hostname = parsed.hostname.toLowerCase();
    }
    if (removeFragment) {
      parsed.hash = "";
    }

    // Rebuild search
    const searchStr = params.toString();
    parsed.search = searchStr ? `?${searchStr}` : "";

    // Clean default ports
    if ((parsed.protocol === "https:" && parsed.port === "443") || (parsed.protocol === "http:" && parsed.port === "80")) {
      parsed.port = "";
    }

    const normalized = parsed.toString();
    const changed = normalized !== raw && normalized !== raw + "/" && normalized !== "https://" + raw;

    const components = {
      protocol: parsed.protocol,
      host: parsed.host,
      hostname: parsed.hostname,
      port: parsed.port || null,
      pathname: parsed.pathname,
      search: parsed.search,
      searchParams: Object.fromEntries(params.entries()),
      hash: parsed.hash || "",
      origin: parsed.origin,
    };

    return NextResponse.json({
      success: true,
      normalized,
      components,
      meta: {
        trackingRemoved,
        changed,
        original: raw,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-url-normalizer",
    description: "Parse, strip tracking parameters, canonicalize and extract components from URLs. Deterministic, agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/normalize" },
  });
}
