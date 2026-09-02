import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
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
