export const metadata = {
  title: "x402 Text Diff",
  description: "Lightweight deterministic text diff. Pay-per-call via x402 USDC on Base.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
