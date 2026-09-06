import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "6000";

export async function GET() {
  return NextResponse.json({
    name: "x402-ip-toolkit",
    version: "1.0.0",
    description:
      "IPv4 validate, normalize, isPrivate, CIDR contains, and int conversion. Fully deterministic, zero variance, agent-native network primitive.",
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
        path: "/api/ip",
        description: "IPv4 utilities",
        input: {
          action: "validate | normalize | isPrivate | cidrContains | toInt | fromInt",
          ip: "string (most actions)",
          cidr: "string e.g. 10.0.0.0/8 (for cidrContains)",
          int: "number 0..4294967295 (for fromInt)",
        },
        output: { success: true, result: "boolean|string|number", meta: "object" },
      },
    ],
    freeDiscovery: true,
    noHumanInLoop: true,
  });
}
