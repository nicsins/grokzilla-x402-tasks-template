import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "6000";

export async function GET() {
  return NextResponse.json({
    name: "x402-base58-toolkit",
    version: "1.0.0",
    description: "Encode/decode Base58 and Base58Check (Bitcoin alphabet + double-SHA256 checksum). Fully deterministic, zero variance, agent-native crypto/text primitive.",
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
        path: "/api/base58",
        description: "Base58 encode | decode | encodeCheck | decodeCheck",
        input: {
          action: "encode | decode | encodeCheck | decodeCheck (required)",
          data: "string (hex or utf8 text for encode; base58 string for decode)",
          encoding: "utf8 | hex (default utf8 for encode)",
          version: "number 0-255 optional (encodeCheck only)",
        },
        output: { success: true /* action-specific fields */ },
      },
    ],
    freeDiscovery: true,
    noHumanInLoop: true,
  });
}
