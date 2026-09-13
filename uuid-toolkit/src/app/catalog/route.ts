import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "4000";

export async function GET() {
  return NextResponse.json({
    name: "x402-uuid-toolkit",
    version: "1.0.0",
    description: "Generate (v4 / v7), validate, parse, and convert UUIDs. Fully deterministic where possible, agent-native identifier primitive.",
    price: {
      amount: MAX_AMOUNT,
      currency: "USDC",
      network: NETWORK,
      human: "~0.004 USDC",
    },
    payTo: PAY_TO,
    endpoints: [
      {
        method: "POST",
        path: "/api/uuid",
        description: "UUID generate | validate | parse | toBytes | fromBytes",
        input: {
          action: "generate | validate | parse | toBytes | fromBytes (required)",
          version: "4 | 7 (for generate, default 4)",
          uuid: "string (for validate/parse/toBytes)",
          bytesHex: "hex string (for fromBytes)",
        },
        output: { success: true /* action-specific fields */ },
      },
    ],
    freeDiscovery: true,
    noHumanInLoop: true,
  });
}
