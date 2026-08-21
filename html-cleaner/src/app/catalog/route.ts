import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    services: [
      {
        id: "html-cleaner",
        name: "HTML Cleaner",
        description: "Deterministic HTML → clean text or lightweight markdown. Removes scripts, styles, tracking and noise. Perfect for agent web ingestion before RAG or summarization.",
        path: "/api/clean",
        method: "POST",
        price: {
          amount: process.env.MAX_AMOUNT_ATOMIC || "10000",
          currency: "USDC",
          network: process.env.NETWORK || "base",
        },
        inputSchema: {
          type: "object",
          required: ["html"],
          properties: {
            html: { type: "string", description: "Raw HTML to clean" },
            options: {
              type: "object",
              properties: {
                format: { type: "string", enum: ["text", "markdown"], default: "text" },
                keepLinks: { type: "boolean", default: false },
                maxLength: { type: "number", default: 50000 },
              },
            },
          },
        },
      },
    ],
  });
}
