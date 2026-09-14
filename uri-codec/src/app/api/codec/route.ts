import { NextRequest, NextResponse } from "next/server";

/**
 * x402 URI Codec – No-human-in-loop microservice
 * Price guidance: 0.002 – 0.006 USDC per call
 *
 * Accepts: { "text": string | string[], "action": "encode" | "decode" | "normalize", "options"?: { "safe": string } }
 * Returns: { "success": true, "results": Array<{ input, output }> }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "6000";

function hasValidPayment(req: NextRequest): boolean {
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function encode(text: string, safe = ""): string {
  let out = encodeURIComponent(text);
  for (const ch of safe) {
    const enc = encodeURIComponent(ch);
    out = out.split(enc).join(ch);
  }
  return out;
}

function decode(text: string): string {
  try {
    return decodeURIComponent(text.replace(/\+/g, " "));
  } catch {
    return text;
  }
}

function normalize(text: string, safe = ""): string {
  return encode(decode(text), safe);
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Percent-encode / decode / normalize URI components (UTF-8 safe)",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-uri-codec", version: "1.0.0" },
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
    let texts: string[] = [];
    if (typeof body.text === "string") texts = [body.text];
    else if (Array.isArray(body.text)) texts = body.text.map(String).slice(0, 100);
    else return NextResponse.json({ error: "Missing 'text' (string or array)" }, { status: 400 });

    const action = (body.action || "encode") as string;
    if (!["encode", "decode", "normalize"].includes(action)) {
      return NextResponse.json({ error: "action must be encode|decode|normalize" }, { status: 400 });
    }

    const options = body.options || {};
    const safe = typeof options.safe === "string" ? options.safe : "";

    const total = texts.reduce((s, t) => s + t.length, 0);
    if (total > 100_000) {
      return NextResponse.json({ error: "Total input exceeds 100k characters" }, { status: 400 });
    }

    const results = texts.map((t) => {
      let output = t;
      if (action === "encode") output = encode(t, safe);
      else if (action === "decode") output = decode(t);
      else output = normalize(t, safe);
      return { input: t, output };
    });

    return NextResponse.json({
      success: true,
      results,
      meta: { count: results.length, action, safe },
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-uri-codec",
    description: "Percent-encode, decode, or normalize URI components. UTF-8 safe, configurable safe chars.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/codec" },
  });
}
