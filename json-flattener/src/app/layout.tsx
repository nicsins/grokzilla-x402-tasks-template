export const metadata = {
  title: "x402 JSON Flattener",
  description: "Deterministic nested JSON flattener. Pay-per-call via x402 USDC on Base.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
