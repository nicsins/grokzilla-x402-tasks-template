import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "9000";

export async function GET() {
  return NextResponse.json({
    name: "x402-json-path-extractor",
    version: "1.0.0",
    description: "Extract value(s) from nested JSON via simple dotted paths + array indices. Supports multiple paths and defaults.",
    protocol: "x402",
    network: NETWORK,
    pricing: {
      amountAtomic: MAX_AMOUNT,
      currency: "USDC",
      guidance: "0.004 – 0.012 USDC per call",
    },
    payTo: PAY_TO,
    endpoints: [
      {
        method: "POST",
        path: "/api/extract",
        description: "Extract by path(s)",
        input: { data: "any JSON", path: "string | string[]", options: { default: "any", flatten: false } },
        output: { success: true, value: "any", meta: {} },
      },
    ],
    free: ["/catalog"],
    tags: ["json", "path", "extract", "data-prep", "agent-utility", "deterministic"],
  });
}
