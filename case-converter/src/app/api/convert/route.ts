import { NextRequest, NextResponse } from "next/server";

/**
 * x402 Case Converter – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.009 USDC per call
 *
 * Accepts: { "text": string, "to": "snake"|"camel"|"kebab"|"pascal"|"constant"|"title"|"lower"|"upper" }
 * Returns: { "success": true, "result": string, "meta": {...} }
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

function toWords(text: string): string[] {
  return String(text || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-\.\s]+/g, " ")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function convertCase(text: string, to: string): string {
  const words = toWords(text);
  if (words.length === 0) return "";

  switch (to) {
    case "snake":
      return words.join("_");
    case "kebab":
      return words.join("-");
    case "camel":
      return words
        .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
        .join("");
    case "pascal":
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
    case "constant":
      return words.join("_").toUpperCase();
    case "title":
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    case "lower":
      return words.join(" ").toLowerCase();
    case "upper":
      return words.join(" ").toUpperCase();
    default:
      return words.join("_"); // safe default snake
  }
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Convert text between naming cases (snake, camel, kebab, pascal, constant, title, etc.) – deterministic",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-case-converter", version: "1.0.0" },
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
    const text = body.text !== undefined ? String(body.text) : String(body);
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "Missing or empty 'text' field" }, { status: 400 });
    }
    if (text.length > 100_000) {
      return NextResponse.json({ error: "Input too large (max 100k chars)" }, { status: 413 });
    }

    const to = (body.to || body.case || "snake").toLowerCase();
    const allowed = ["snake", "camel", "kebab", "pascal", "constant", "title", "lower", "upper"];
    if (!allowed.includes(to)) {
      return NextResponse.json(
        { error: `Invalid 'to' value. Allowed: ${allowed.join(", ")}` },
        { status: 400 }
      );
    }

    const result = convertCase(text, to);

    return NextResponse.json({
      success: true,
      result,
      meta: {
        originalLength: text.length,
        resultLength: result.length,
        to,
        wordCount: toWords(text).length,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-case-converter",
    description: "Deterministic text case conversion (snake/camel/kebab/pascal/constant/title/lower/upper). Agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/convert" },
  });
}
