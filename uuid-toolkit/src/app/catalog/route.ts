import { NextResponse } from "next/server";

const PAY_TO = process.env.TREASURY_ADDRESS || process.env.PAY_TO_ADDRESS || "0xc22f9CAEBAc37fE72D5142f35f21f6696Ea9Ef69";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "5000";

export async function GET() {
  return NextResponse.json({
    name: "x402-uuid-toolkit",
    version: "1.0.0",
    description: "Generate (v4/v7), validate, and parse UUIDs. Extract timestamp from v7. Fully deterministic validation + pure crypto generation. Agent-native.",
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
        path: "/api/uuid",
        description: "Generate, validate, or parse UUIDs",
        input: {
          action: "generate | validate | parse (required)",
          version: "4 | 7 (for generate, default 4)",
          uuid: "string (required for validate/parse)",
        },
        output: { success: true, result: "object", meta: "object" },
      },
    ],
    freeDiscovery: true,
    noHumanInLoop: true,
  });
}
