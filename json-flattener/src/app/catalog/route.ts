import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "10000";

export async function GET() {
  return NextResponse.json({
    name: "x402-json-flattener",
    version: "1.0.0",
    description: "Deterministic nested JSON → flat path-value map. Supports arrays, custom separators, depth limits.",
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
        path: "/api/flatten",
        description: "Flatten JSON",
        input: { data: "any JSON", options: { separator: ".", arrayStyle: "index|bracket", maxDepth: 20 } },
        output: { success: true, flat: "Record<path, value>", meta: {} },
      },
    ],
    free: ["/catalog"],
    tags: ["json", "flatten", "data-prep", "agent-utility", "deterministic"],
  });
}
