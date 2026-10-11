import { NextResponse } from "next/server";
import { PAY_TO, NETWORK } from "../../lib/treasury";

const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "3000";

export async function GET() {
  return NextResponse.json({
    name: "x402-hash-digest",
    version: "1.0.0",
    description:
      "Compute SHA-256 / SHA-512 / SHA-1 / MD5 digests of utf8 or hex input. Returns hex + base64. Input size limited to 1 MB. Agent-native.",
    price: {
      amount: MAX_AMOUNT,
      currency: "USDC",
      network: NETWORK,
      human: "~0.003 USDC",
    },
    payTo: PAY_TO,
    endpoints: [
      {
        method: "POST",
        path: "/api/hash",
        description: "Compute cryptographic digest",
        input: {
          action: "digest (optional, default digest)",
          algorithm: "sha256 | sha512 | sha1 | md5 (default: sha256)",
          input: "string (required)",
          encoding: "utf8 | hex (default: utf8)",
        },
        output: {
          success: true,
          result: { algorithm: "string", hex: "string", base64: "string", byteLength: "number" },
          meta: "object",
        },
      },
    ],
    freeDiscovery: true,
    noHumanInLoop: true,
  });
}
