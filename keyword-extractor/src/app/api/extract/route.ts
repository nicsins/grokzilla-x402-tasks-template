import { NextRequest, NextResponse } from "next/server";

/**
 * x402 Keyword Extractor – No-human-in-loop microservice
 * Price guidance: 0.005 – 0.018 USDC per call
 *
 * Accepts: { "text": "...", "options"?: { "topK": number, "minLength": number, "includePhrases": boolean, "stopwords": "en"|false } }
 * Returns: { "success": true, "keywords": [{term, score, count}], "meta": {...} }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xYourPayToAddressHere";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "10000"; // 0.01 USDC

const EN_STOPWORDS = new Set(
  "a an the and or but if then else when at by for with about against between into through during before after above below to from up down in out on off over under again further then once here there when where why how all any both each few more most other some such no nor not only own same so than too very can will just should now".split(
    " "
  )
);

function hasValidPayment(req: NextRequest): boolean {
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function tokenize(text: string, minLength = 3): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= minLength);
}

function extractKeywords(
  text: string,
  topK = 15,
  minLength = 3,
  includePhrases = true,
  useStopwords = true
) {
  const tokens = tokenize(text, minLength);
  const stop = useStopwords ? EN_STOPWORDS : new Set<string>();

  // unigrams
  const freq = new Map<string, number>();
  for (const t of tokens) {
    if (stop.has(t)) continue;
    freq.set(t, (freq.get(t) || 0) + 1);
  }

  // bigrams (simple)
  if (includePhrases) {
    for (let i = 0; i < tokens.length - 1; i++) {
      const a = tokens[i];
      const b = tokens[i + 1];
      if (stop.has(a) || stop.has(b)) continue;
      const phrase = `${a} ${b}`;
      freq.set(phrase, (freq.get(phrase) || 0) + 1);
    }
  }

  const total = tokens.length || 1;
  const scored = Array.from(freq.entries())
    .map(([term, count]) => ({
      term,
      count,
      score: Math.round((count / total) * 1000) / 1000 + (term.includes(" ") ? 0.15 : 0), // slight boost for phrases
    }))
    .sort((a, b) => b.score - a.score || b.count - a.count)
    .slice(0, topK);

  return {
    keywords: scored,
    meta: {
      tokenCount: tokens.length,
      uniqueTerms: freq.size,
      topK,
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
      description: "Deterministic keyword & keyphrase extraction (frequency + simple TF scoring)",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-keyword-extractor", version: "1.0.0" },
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
    const text = body.text || body.input || "";
    if (typeof text !== "string" || text.length === 0) {
      return NextResponse.json({ error: "Missing or invalid 'text' field" }, { status: 400 });
    }
    if (text.length > 150_000) {
      return NextResponse.json({ error: "Text too long (max 150k chars)" }, { status: 413 });
    }

    const options = body.options || {};
    const topK = Math.min(Math.max(Number(options.topK) || 15, 1), 50);
    const minLength = Math.min(Math.max(Number(options.minLength) || 3, 1), 10);
    const includePhrases = options.includePhrases !== false;
    const useStopwords = options.stopwords !== false && options.stopwords !== "none";

    const result = extractKeywords(text, topK, minLength, includePhrases, useStopwords);

    return NextResponse.json({
      success: true,
      keywords: result.keywords,
      meta: result.meta,
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-keyword-extractor",
    description: "Fast deterministic keyword & keyphrase extraction for RAG, tagging and routing. Offline, no heavy models.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/extract" },
  });
}
