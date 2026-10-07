import { NextResponse } from "next/server";

const PAY_TO = process.env.TREASURY_ADDRESS || process.env.PAY_TO_ADDRESS || "0xc22f9CAEBAc37fE72D5142f35f21f6696Ea9Ef69";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "6000";

export async function GET() {
  return NextResponse.json({
    name: "x402-hash-generator",
    version: "1.0.0",
    description: "Compute SHA-256 / SHA-1 / MD5 / SHA-512 of any text or JSON payload. Deterministic content addressing for agents.",
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
        path: "/api/hash",
        description: "Hash text or object",
        input: {
          text: "string or object (required)",
          algorithm: "sha256 | sha1 | md5 | sha512 (default: sha256)",
        },
        output: { success: true, hash: "hex string", meta: "object" },
      },
    ],
    freeDiscovery: true,
    noHumanInLoop: true,
  });
}
