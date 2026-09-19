export default function Page() {
  return (
    <main style={{fontFamily: "system-ui", padding: "2rem"}}>
      <h1>x402 cidr-toolkit</h1>
      <p>Agent-native microservice. See /catalog and POST /api/cidr endpoints.</p>
      <ul>
        <li>parse — network, broadcast, host count, first/last</li>
        <li>contains — test IP membership in CIDR</li>
        <li>expand — list hosts (small prefixes only)</li>
        <li>summarize — compact range summary</li>
      </ul>
    </main>
  );
}
