import { NextRequest, NextResponse } from "next/server";

/**
 * x402 HTML Cleaner – No-human-in-loop microservice
 * Price guidance: 0.005 – 0.015 USDC per call
 *
 * Accepts: { "html": "...", "options"?: { "format": "text"|"markdown", "keepLinks": boolean, "maxLength": number } }
 * Returns: { "success": true, "text": "...", "meta": {...} }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xYourPayToAddressHere";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "10000"; // 0.01 USDC

function hasValidPayment(req: NextRequest): boolean {
  // STUB: replace with real x402 / facilitator verification in production
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function stripTags(html: string, keepLinks = false): string {
  let text = html
    // remove script/style/noscript completely
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    // remove comments
    .replace(/<!--[\s\S]*?-->/g, " ")
    // optional: keep link text
    .replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) =>
      keepLinks ? `${inner.trim()} (${href})` : inner
    )
    // strip remaining tags
    .replace(/<[^>]+>/g, " ")
    // decode common entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

function toMarkdownLite(html: string): string {
  // Very lightweight structural conversion (no full MD parser)
  let md = html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "$1\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*");
  return stripTags(md, false);
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Clean HTML to plain text or lightweight markdown (strip scripts, styles, noise)",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-html-cleaner", version: "1.0.0" },
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
    const html = body.html || body.input || "";
    if (typeof html !== "string" || html.length === 0) {
      return NextResponse.json({ error: "Missing or invalid 'html' field" }, { status: 400 });
    }
    if (html.length > 200_000) {
      return NextResponse.json({ error: "HTML too long (max 200k chars)" }, { status: 413 });
    }

    const options = body.options || {};
    const format = options.format === "markdown" ? "markdown" : "text";
    const keepLinks = Boolean(options.keepLinks);
    const maxLength = Math.min(Number(options.maxLength) || 50000, 100000);

    let cleaned = format === "markdown" ? toMarkdownLite(html) : stripTags(html, keepLinks);
    if (cleaned.length > maxLength) cleaned = cleaned.slice(0, maxLength) + "…";

    return NextResponse.json({
      success: true,
      text: cleaned,
      meta: {
        originalBytes: html.length,
        cleanedBytes: cleaned.length,
        format,
        keepLinks,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-html-cleaner",
    description: "Convert HTML to clean plain text or lightweight markdown. Strips scripts, styles and noise. Agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/clean" },
  });
}
