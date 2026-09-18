import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "5000";

export async function GET() {
  return NextResponse.json({
    name: "x402-slugify-toolkit",
    version: "1.0.0",
    description: "Unicode-aware deterministic slug generation (diacritic transliteration, separator control, max length). Fully deterministic, zero variance, agent-native utility for paths, filenames, and resource IDs.",
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
        path: "/api/slugify",
        description: "Generate a clean slug from arbitrary text",
        input: {
          text: "string (required)",
          options: {
            separator: "string (default '-')",
            maxLength: "number 1-500 (default 80)",
            lowercase: "boolean (default true)",
          },
        },
        output: { success: true, original: "string", slug: "string", length: "number" },
      },
    ],
    freeDiscovery: true,
    noHumanInLoop: true,
  });
}
