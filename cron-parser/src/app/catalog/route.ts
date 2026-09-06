import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "8000";

export async function GET() {
  return NextResponse.json({
    name: "x402-cron-parser",
    version: "1.0.0",
    description:
      "Parse standard 5-field cron, produce human descriptions, and compute next N UTC run times. Fully deterministic, agent-native scheduler primitive.",
    price: {
      amount: MAX_AMOUNT,
      currency: "USDC",
      network: NETWORK,
      human: "~0.008 USDC",
    },
    payTo: PAY_TO,
    endpoints: [
      {
        method: "POST",
        path: "/api/cron",
        description: "Cron parse / human / next runs",
        input: {
          action: "parse | human | next",
          expression: "string (required) e.g. '0 9 * * 1-5'",
          from: "ISO timestamp (optional, for next)",
          count: "1-20 (optional, default 5, for next)",
        },
        output: { success: true, result: "object|string|string[]", meta: "object" },
      },
    ],
    freeDiscovery: true,
    noHumanInLoop: true,
  });
}
