import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    services: [
      {
        id: "pii-redactor",
        name: "PII Redactor",
        description: "Strip emails, phones, SSNs, credit cards, and IPs from text. Deterministic, fast, agent-friendly.",
        path: "/api/redact",
        method: "POST",
        price: {
          amount: process.env.MAX_AMOUNT_ATOMIC || "10000",
          currency: "USDC",
          network: process.env.NETWORK || "base",
        },
        inputSchema: {
          type: "object",
          required: ["text"],
          properties: {
            text: { type: "string", description: "Text to redact" },
            options: {
              type: "object",
              properties: {
                maskChar: { type: "string", default: "*" },
              },
            },
          },
        },
      },
    ],
  });
}
