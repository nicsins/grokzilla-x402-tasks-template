import { NextResponse } from "next/server";

const PAY_TO = process.env.TREASURY_ADDRESS || process.env.PAY_TO_ADDRESS || "0xc22f9CAEBAc37fE72D5142f35f21f6696Ea9Ef69";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "6000";

export async function GET() {
  return NextResponse.json({
    name: "x402-jaccard-similarity",
    version: "1.0.0",
    description: "Compute Jaccard index and Dice coefficient between two strings or token arrays. Fully deterministic, agent-native.",
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
        path: "/api/jaccard",
        description: "Jaccard + Dice similarity",
        input: {
          a: "string or string[] (required)",
          b: "string or string[] (required)",
          tokenize: "\"word\" | \"char\" (optional, default word)",
        },
        output: { success: true, jaccard: "number", dice: "number", meta: "object" },
      },
    ],
    freeDiscovery: true,
    noHumanInLoop: true,
  });
}
