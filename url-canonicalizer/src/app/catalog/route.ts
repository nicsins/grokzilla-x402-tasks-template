import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "6000";

export async function GET() {
  return NextResponse.json({
    name: "x402-url-canonicalizer",
    version: "1.0.0",
    description: "Deterministic URL canonicalization (lowercase host, sorted query, normalized path, optional fragment removal). Fully deterministic, zero variance, agent-native utility for cache keys and resource identity.",
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
        path: "/api/canonicalize",
        description: "Canonicalize a URL",
        input: {
          url: "string (required) — any absolute or protocol-relative URL",
          options: {
            removeFragment: "boolean (default true)",
            trailingSlash: '"keep" | "remove" | "add"',
            lowercasePath: "boolean (default false)",
          },
        },
        output: { success: true, original: "string", canonical: "string", components: "object" },
      },
    ],
    freeDiscovery: true,
    noHumanInLoop: true,
  });
}
