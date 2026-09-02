import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "7000";

export async function GET() {
  return NextResponse.json({
    name: "x402-case-converter",
    version: "1.0.0",
    description: "Convert text between common naming cases. Fully deterministic, zero variance, agent-native.",
    price: {
      amount: MAX_AMOUNT,
      currency: "USDC",
      network: NETWORK,
      human: "~0.007 USDC",
    },
    payTo: PAY_TO,
    endpoints: [
      {
        method: "POST",
        path: "/api/convert",
        description: "Convert text to target case",
        input: {
          text: "string (required)",
          to: "snake | camel | kebab | pascal | constant | title | lower | upper (default: snake)",
        },
        output: { success: true, result: "string", meta: "object" },
      },
    ],
    freeDiscovery: true,
    noHumanInLoop: true,
  });
}
