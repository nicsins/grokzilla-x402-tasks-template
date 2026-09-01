export default function Page() {
  return (
    <main style={{ fontFamily: "ui-sans-serif, system-ui", padding: 24, maxWidth: 720 }}>
      <h1>x402 Text Diff</h1>
      <p>Line / word / char diff with structured or unified output. Agent-native micropayments (USDC on Base).</p>
      <ul>
        <li>GET /catalog — free discovery</li>
        <li>GET /api/diff — service info</li>
        <li>POST /api/diff — paid diff (HTTP 402 if unpaid)</li>
        <li>GET /llms.txt — agent instructions</li>
      </ul>
    </main>
  );
}
