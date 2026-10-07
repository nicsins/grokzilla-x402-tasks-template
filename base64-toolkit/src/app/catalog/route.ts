import { NextResponse } from "next/server";

const PAY_TO = process.env.TREASURY_ADDRESS || process.env.PAY_TO_ADDRESS || "0xc22f9CAEBAc37fE72D5142f35f21f6696Ea9Ef69";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "6000";

export async function GET() {
  return NextResponse.json({
    name: "x402-base64-toolkit",
    version: "1.0.0",
    description: "Encode or decode Base64 strings (standard or URL-safe). Fully deterministic, zero variance, agent-native.",
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
        path: "/api/codec",
        description: "Encode or decode Base64",
        input: {
          action: "encode | decode (default: encode)",
          data: "string (required)",
          urlSafe: "boolean (optional, default false)",
        },
        output: { success: true, result: "string", meta: "object" },
      },
    ],
    freeDiscovery: true,
    noHumanInLoop: true,
  });
}
