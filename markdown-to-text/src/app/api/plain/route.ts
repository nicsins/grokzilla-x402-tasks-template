import { NextRequest, NextResponse } from "next/server";

/**
 * x402 Markdown-to-Text – No-human-in-loop microservice
 * Price guidance: 0.004 – 0.012 USDC per call
 *
 * Accepts: { "markdown": string, "options"?: { "keepLinks": boolean, "keepCode": boolean } }
 * Returns: { "success": true, "text": string, "meta": {...} }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "9000"; // ~0.009 USDC

function hasValidPayment(req: NextRequest): boolean {
  // STUB: replace with real x402 / facilitator verification in production
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function markdownToPlain(md: string, keepLinks = false, keepCode = true): string {
  let text = String(md || "");

  // Remove fenced code blocks first (preserve content if keepCode)
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    if (!keepCode) return "";
    const content = match.replace(/^```[^\n]*\n?/, "").replace(/```$/, "");
    return content.trim() + "\n";
  });

  // Inline code
  text = text.replace(/`([^`]+)`/g, keepCode ? "$1" : "");

  // Headers
  text = text.replace(/^#{1,6}\s+/gm, "");

  // Bold / italic
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)(.*?)\1/g, "$2");

  // Images
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");

  // Links
  if (keepLinks) {
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");
  } else {
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  }

  // Blockquotes
  text = text.replace(/^>\s?/gm, "");

  // Horizontal rules
  text = text.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, "");

  // Lists
  text = text.replace(/^[\s]*[-*+]\s+/gm, "• ");
  text = text.replace(/^[\s]*\d+\.\s+/gm, (m) => m.replace(/\d+\./, "•"));

  // HTML tags (simple)
  text = text.replace(/<[^>]+>/g, "");

  // Collapse excessive whitespace while preserving paragraphs
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return text;
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Convert Markdown to clean plain text (deterministic strip of formatting)",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-markdown-to-text", version: "1.0.0" },
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
    const markdown = body.markdown !== undefined ? String(body.markdown) : String(body.text || body);
    if (!markdown || markdown.trim().length === 0) {
      return NextResponse.json({ error: "Missing or empty 'markdown' field" }, { status: 400 });
    }
    if (markdown.length > 300_000) {
      return NextResponse.json({ error: "Input too large (max 300k chars)" }, { status: 413 });
    }

    const options = body.options || {};
    const keepLinks = options.keepLinks === true;
    const keepCode = options.keepCode !== false;

    const text = markdownToPlain(markdown, keepLinks, keepCode);

    return NextResponse.json({
      success: true,
      text,
      meta: {
        originalLength: markdown.length,
        resultLength: text.length,
        keepLinks,
        keepCode,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-markdown-to-text",
    description: "Deterministic Markdown → clean plain text. Strips formatting while preserving readable content. Agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/plain" },
  });
}
