import { NextResponse } from "next/server";

const PAY_TO = process.env.TREASURY_ADDRESS || process.env.PAY_TO_ADDRESS || "0xc22f9CAEBAc37fE72D5142f35f21f6696Ea9Ef69";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "8000";

export async function GET() {
  return NextResponse.json({
    name: "x402-slug-generator",
    version: "1.0.0",
    description: "Deterministic text → clean URL/SEO slug. Supports custom separator, length limit, strict mode.",
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
        path: "/api/slugify",
        description: "Generate slug from text",
        input: { text: "string", options: { separator: "-", lower: true, maxLength: 80, strict: true } },
        output: { success: true, slug: "string", meta: {} },
      },
    ],
    free: ["/catalog"],
    tags: ["slug", "url", "seo", "text-utils", "agent-utility", "deterministic"],
  });
}
