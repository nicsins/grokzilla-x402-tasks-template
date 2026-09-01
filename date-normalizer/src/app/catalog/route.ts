import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "7000";

export async function GET() {
  return NextResponse.json({
    name: "x402-date-normalizer",
    version: "1.0.0",
    description: "Normalize loose date strings and timestamps to ISO-8601 (or unix / UTC string). Agent-friendly deterministic parsing.",
    protocol: "x402",
    network: NETWORK,
    pricing: {
      amountAtomic: MAX_AMOUNT,
      currency: "USDC",
      guidance: "0.003 – 0.009 USDC per call",
    },
    payTo: PAY_TO,
    endpoints: [
      {
        method: "POST",
        path: "/api/normalize",
        description: "Normalize date",
        input: { date: "string | number", options: { output: "iso|unix|date", timezoneOffset: 0 } },
        output: { success: true, normalized: "string|number", meta: {} },
      },
    ],
    free: ["/catalog"],
    tags: ["date", "normalize", "iso", "timestamp", "agent-utility", "deterministic"],
  });
}
