import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "7000";

export async function GET() {
  return NextResponse.json({
    name: "x402-semver-toolkit",
    version: "1.0.0",
    description:
      "Parse, compare, bump or test semantic versions (semver). Fully deterministic, zero variance, agent-native. Ideal for package managers, release bots and dependency agents.",
    price: {
      amount: MAX_AMOUNT,
      currency: "USDC",
      network: NETWORK,
      human: "~0.007 USDC",
    },
    payTo: PAY_TO,
    endpoints: [
      {
        method: "POST",
        path: "/api/semver",
        description: "Semver operations",
        input: {
          action: "parse | compare | bump | satisfies",
          version: "string (for parse/bump/satisfies)",
          a: "string (for compare)",
          b: "string (for compare)",
          level: "major | minor | patch | prerelease (for bump)",
          range: "string e.g. '>=1.0.0 <2.0.0' (for satisfies)",
        },
        output: { success: true, result: "object|number|string|boolean", meta: "object" },
      },
    ],
    freeDiscovery: true,
    noHumanInLoop: true,
  });
}
