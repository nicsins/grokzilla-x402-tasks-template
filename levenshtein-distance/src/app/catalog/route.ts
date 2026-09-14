import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "8000";

export async function GET() {
  return NextResponse.json({
    name: "x402-levenshtein-distance",
    version: "1.0.0",
    description: "Levenshtein / Damerau-Levenshtein edit distance + normalized similarity (0–1). Pure DP, size-capped.",
    protocol: "x402",
    network: NETWORK,
    pricing: {
      amountAtomic: MAX_AMOUNT,
      currency: "USDC",
      guidance: "0.003 – 0.008 USDC per call",
    },
    payTo: PAY_TO,
    endpoints: [
      {
        method: "POST",
        path: "/api/distance",
        description: "Compute edit distance and similarity",
        input: { a: "string", b: "string", options: { damerau: false, maxLen: 2000 } },
        output: { success: true, distance: "number", similarity: "0-1", meta: {} },
      },
    ],
    free: ["/catalog"],
    tags: ["string", "fuzzy", "distance", "similarity", "agent-utility", "deterministic"],
  });
}
