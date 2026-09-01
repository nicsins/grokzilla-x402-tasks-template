import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xYourPayToAddressHere";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "8000";

export async function GET() {
  return NextResponse.json({
    name: "x402-url-normalizer",
    version: "1.0.0",
    description: "Deterministic URL parsing, tracking-param stripping, HTTPS force, host lowercasing, query sorting & component extraction.",
    protocol: "x402",
    network: NETWORK,
    pricing: {
      amountAtomic: MAX_AMOUNT,
      currency: "USDC",
      guidance: "0.003 – 0.01 USDC per call",
    },
    payTo: PAY_TO,
    endpoints: [
      {
        method: "POST",
        path: "/api/normalize",
        description: "Normalize URL",
        input: {
          url: "string",
          options: {
            stripTracking: true,
            forceHttps: true,
            lowercaseHost: true,
            removeFragment: false,
            sortQuery: true,
          },
        },
        output: { success: true, normalized: "string", components: {}, meta: {} },
      },
    ],
    free: ["/catalog"],
    tags: ["url", "normalize", "tracking", "canonical", "agent-utility", "deterministic"],
  });
}
