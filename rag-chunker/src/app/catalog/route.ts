import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    services: [
      {
        id: "rag-chunker",
        name: "RAG Chunker",
        description: "Split long text into overlapping, sentence-aware chunks optimized for retrieval-augmented generation pipelines. Fully deterministic.",
        path: "/api/chunk",
        method: "POST",
        price: {
          amount: process.env.MAX_AMOUNT_ATOMIC || "12000",
          currency: "USDC",
          network: process.env.NETWORK || "base",
        },
        inputSchema: {
          type: "object",
          required: ["text"],
          properties: {
            text: { type: "string", description: "Text to chunk" },
            options: {
              type: "object",
              properties: {
                chunkSize: { type: "number", default: 512 },
                overlap: { type: "number", default: 64 },
                minChunkSize: { type: "number", default: 100 },
                strategy: { type: "string", enum: ["sentence", "fixed"], default: "sentence" },
              },
            },
          },
        },
      },
    ],
  });
}
