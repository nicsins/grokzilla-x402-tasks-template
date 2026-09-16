import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "5000";

export async function GET() {
  return NextResponse.json({
    name: "x402-querystring-toolkit",
    version: "1.0.0",
    description: "Parse, stringify, and normalize query strings with stable key ordering. Fully deterministic, agent-native.",
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
        path: "/api/qs",
        description: "Parse / stringify / normalize query strings",
        input: {
          action: "parse | stringify | normalize (required)",
          input: "string (for parse/normalize) or object (for stringify)",
          options: "object (optional: sort, arrayFormat, stripEmpty)",
        },
        output: { success: true, result: "string|object", meta: "object" },
      },
    ],
    freeDiscovery: true,
    noHumanInLoop: true,
  });
}
