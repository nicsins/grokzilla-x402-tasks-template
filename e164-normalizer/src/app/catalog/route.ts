import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "6000";

export async function GET() {
  return NextResponse.json({
    name: "x402-e164-normalizer",
    version: "1.0.0",
    description: "Normalize phone numbers to E.164 format. Country code detection, length validation, structured output. Agent-native, pure rules.",
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
        path: "/api/normalize",
        description: "Normalize a phone number to E.164",
        input: {
          phone: "string (required)",
          defaultCountry: "ISO 3166-1 alpha-2 (optional, e.g. US)",
        },
        output: { success: true, result: "object", meta: "object" },
      },
    ],
    freeDiscovery: true,
    noHumanInLoop: true,
  });
}
