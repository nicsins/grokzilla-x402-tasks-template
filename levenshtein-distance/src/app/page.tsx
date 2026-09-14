export default function Page() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 640 }}>
      <h1>x402 Levenshtein Distance</h1>
      <p>No-human-in-loop microservice. Pay-per-call USDC on Base via x402.</p>
      <ul>
        <li>GET /catalog – free discovery</li>
        <li>POST /api/distance – paid distance + similarity</li>
      </ul>
      <p>See <code>llms.txt</code> for agent instructions.</p>
    </main>
  );
}
