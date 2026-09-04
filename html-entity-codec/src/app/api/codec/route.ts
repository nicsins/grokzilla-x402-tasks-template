import { NextRequest, NextResponse } from "next/server";

/**
 * x402 HTML Entity Codec – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.008 USDC per call
 *
 * Accepts: { "action": "encode"|"decode", "text": string, "mode"?: "named"|"numeric"|"both" }
 * Returns: { "success": true, "result": string, "meta": {...} }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "5500"; // ~0.0055 USDC

function hasValidPayment(req: NextRequest): boolean {
  // STUB: replace with real x402 / facilitator verification in production
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

const NAMED: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  " ": "&nbsp;",
};

const REVERSE_NAMED: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function encodeEntities(text: string, mode: string): string {
  if (mode === "numeric") {
    return text.replace(/[&<>"' ]/g, (ch) => `&#${ch.charCodeAt(0)};`);
  }
  // named (default) or both → prefer named
  return text.replace(/[&<>"']/g, (ch) => NAMED[ch] || ch);
}

function decodeEntities(text: string): string {
  // numeric first
  let out = text.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  // named
  for (const [ent, ch] of Object.entries(REVERSE_NAMED)) {
    out = out.split(ent).join(ch);
  }
  return out;
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Encode or decode HTML entities (named + numeric). Deterministic agent utility.",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-html-entity-codec", version: "1.0.0" },
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
    const action = (body.action || body.mode || "encode").toLowerCase();
    const text = body.text !== undefined ? String(body.text) : String(body.data || "");
    const mode = (body.mode || "named").toLowerCase();

    if (!text) {
      return NextResponse.json({ error: "Missing or empty 'text' field" }, { status: 400 });
    }
    if (text.length > 150_000) {
      return NextResponse.json({ error: "Input too large (max 150k chars)" }, { status: 413 });
    }
    if (!["encode", "decode"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid 'action'. Allowed: encode | decode" },
        { status: 400 }
      );
    }

    let result: string;
    if (action === "encode") {
      result = encodeEntities(text, mode);
    } else {
      result = decodeEntities(text);
    }

    return NextResponse.json({
      success: true,
      result,
      meta: {
        action,
        mode: action === "encode" ? mode : "auto",
        inputLength: text.length,
        resultLength: result.length,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-html-entity-codec",
    description: "Deterministic HTML entity encode/decode (named + numeric). Agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/codec" },
  });
}
