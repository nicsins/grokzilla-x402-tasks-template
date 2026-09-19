import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "5000";

export async function GET() {
  return NextResponse.json({
    name: "x402-cidr-toolkit",
    version: "1.0.0",
    description:
      "Parse IPv4 CIDR, test IP membership, expand small prefixes (capped), summarize ranges. Pure arithmetic, zero deps, size-guarded. Agent-native.",
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
        path: "/api/cidr",
        description: "Parse, contains, expand, or summarize IPv4 CIDR",
        input: {
          action: "parse | contains | expand | summarize (required)",
          cidr: "string (required) e.g. 192.168.1.0/24",
          ip: "string (required for contains)",
          limit: "number (optional for expand, max 256)",
        },
        output: { success: true, result: "object", meta: "object" },
      },
    ],
    freeDiscovery: true,
    noHumanInLoop: true,
  });
}
