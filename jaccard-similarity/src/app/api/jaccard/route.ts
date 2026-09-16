import { NextRequest, NextResponse } from "next/server";

/**
 * x402 Jaccard Similarity – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.008 USDC per call
 *
 * Accepts: { "a": string|string[], "b": string|string[], "tokenize"?: "word"|"char" }
 * Returns: { "success": true, "jaccard": number, "dice": number, "meta": {...} }
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

function toTokenSet(input: string | string[], tokenize: "word" | "char"): Set<string> {
  if (Array.isArray(input)) {
    return new Set(input.map((t) => String(t).toLowerCase().trim()).filter(Boolean));
  }
  const s = String(input || "").toLowerCase().trim();
  if (tokenize === "char") {
    return new Set(s.replace(/\s+/g, "").split("").filter(Boolean));
  }
  // word tokenize
  return new Set(s.split(/[^a-z0-9]+/).filter(Boolean));
}

function jaccardAndDice(a: Set<string>, b: Set<string>): { jaccard: number; dice: number; intersection: number; union: number } {
  if (a.size === 0 && b.size === 0) {
    return { jaccard: 1, dice: 1, intersection: 0, union: 0 };
  }
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  const jaccard = union === 0 ? 0 : intersection / union;
  const dice = a.size + b.size === 0 ? 0 : (2 * intersection) / (a.size + b.size);
  return { jaccard, dice, intersection, union };
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Compute Jaccard and Dice similarity between two token sets or strings – deterministic",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-jaccard-similarity", version: "1.0.0" },
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
    if (body.a === undefined || body.b === undefined) {
      return NextResponse.json({ error: "Both 'a' and 'b' fields are required" }, { status: 400 });
    }

    const tokenize = (body.tokenize === "char" ? "char" : "word") as "word" | "char";
    const setA = toTokenSet(body.a, tokenize);
    const setB = toTokenSet(body.b, tokenize);

    if (setA.size > 10_000 || setB.size > 10_000) {
      return NextResponse.json({ error: "Token set too large (max 10k unique tokens)" }, { status: 413 });
    }

    const result = jaccardAndDice(setA, setB);

    return NextResponse.json({
      success: true,
      jaccard: Number(result.jaccard.toFixed(6)),
      dice: Number(result.dice.toFixed(6)),
      meta: {
        tokenize,
        sizeA: setA.size,
        sizeB: setB.size,
        intersection: result.intersection,
        union: result.union,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-jaccard-similarity",
    description: "Deterministic Jaccard + Dice similarity for strings or token arrays. Agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/jaccard" },
  });
}
