import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "9000";

export async function GET() {
  return NextResponse.json({
    name: "x402-markdown-to-text",
    version: "1.0.0",
    description: "Convert Markdown documents to clean plain text. Deterministic, no external deps, agent-native.",
    price: {
      amount: MAX_AMOUNT,
      currency: "USDC",
      network: NETWORK,
      human: "~0.009 USDC",
    },
    payTo: PAY_TO,
    endpoints: [
      {
        method: "POST",
        path: "/api/plain",
        description: "Markdown → plain text",
        input: {
          markdown: "string (required)",
          options: {
            keepLinks: "boolean (default false)",
            keepCode: "boolean (default true)",
          },
        },
        output: { success: true, text: "string", meta: "object" },
      },
    ],
    freeDiscovery: true,
    noHumanInLoop: true,
  });
}
