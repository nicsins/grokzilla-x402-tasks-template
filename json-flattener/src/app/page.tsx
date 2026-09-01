export default function Page() {
  return (
    <main style={{ fontFamily: "ui-sans-serif, system-ui", padding: 24, maxWidth: 720 }}>
      <h1>x402 JSON Flattener</h1>
      <p>Deterministic nested JSON → flat path-value map. Agent-native micropayments (USDC on Base).</p>
      <ul>
        <li>GET /catalog — free discovery</li>
        <li>GET /api/flatten — service info</li>
        <li>POST /api/flatten — paid flatten (HTTP 402 if unpaid)</li>
        <li>GET /llms.txt — agent instructions</li>
      </ul>
    </main>
  );
}
