import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "5000";

export async function GET() {
  return NextResponse.json({
    name: "x402-slugify",
    version: "1.0.0",
    description: "Generate deterministic URL-safe slugs from arbitrary text. Lowercase, hyphenated, ASCII-normalized. Fully agent-native.",
    price: {
      amount: MAX_AMOUNT,
      currency: "USDC",
      network: NETWORK,
      human: "~0.005 USDC",
    },
    payTo: PAY_TO,
    endpoints: [
      {
        method: "POST",
        path: "/api/slug",
        description: "Create a clean slug",
        input: {
          text: "string (required)",
          maxLength: "number (optional, default 120)",
          separator: "string (optional, default '-')",
        },
        output: { success: true, slug: "string", meta: "object" },
      },
    ],
    freeDiscovery: true,
    noHumanInLoop: true,
  });
}
