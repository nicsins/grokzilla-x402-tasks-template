export default function Page() {
  return (
    <main style={{ fontFamily: "ui-sans-serif, system-ui", padding: 24, maxWidth: 720 }}>
      <h1>x402 URL Normalizer</h1>
      <p>Parse, strip tracking, force HTTPS, sort query, extract components. Agent-native micropayments (USDC on Base).</p>
      <ul>
        <li>GET /catalog — free discovery</li>
        <li>GET /api/normalize — service info</li>
        <li>POST /api/normalize — paid normalize (HTTP 402 if unpaid)</li>
        <li>GET /llms.txt — agent instructions</li>
      </ul>
    </main>
  );
}
