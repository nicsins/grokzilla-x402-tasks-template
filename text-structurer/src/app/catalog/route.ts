import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    services: [
      {
        id: "text-structurer",
        name: "Text Structurer",
        description: "Extract key-value facts and common entities (emails, URLs, phones, dates, money) from unstructured text.",
        path: "/api/structure",
        method: "POST",
        price: {
          amount: process.env.MAX_AMOUNT_ATOMIC || "15000",
          currency: "USDC",
          network: process.env.NETWORK || "base",
        },
      },
    ],
  });
}
