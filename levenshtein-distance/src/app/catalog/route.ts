import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "6000";

export async function GET() {
  return NextResponse.json({
    name: "x402-levenshtein-distance",
    version: "1.0.0",
    description: "Compute Levenshtein edit distance and normalized similarity ratio (0-1) between two strings. Supports early-exit maxDistance. Fully deterministic, zero variance, agent-native.",
    price: {
      amount: MAX_AMOUNT,
      currency: "USDC",
      network: NETWORK,
      human: "~0.006 USDC",
    },
    payTo: PAY_TO,
    endpoints: [
      {
        method: "POST",
        path: "/api/distance",
        description: "Levenshtein distance + similarity",
        input: {
          a: "string (required)",
          b: "string (required)",
          maxDistance: "number (optional, early exit)",
          includeOps: "boolean (optional, short strings only)",
        },
        output: { success: true, distance: "number", similarity: "number 0-1", meta: "object" },
      },
    ],
    freeDiscovery: true,
    noHumanInLoop: true,
  });
}
