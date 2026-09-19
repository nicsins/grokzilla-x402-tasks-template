export default function Page() {
  return (
    <main style={{fontFamily: "system-ui", padding: "2rem"}}>
      <h1>x402 hash-digest</h1>
      <p>Agent-native microservice. See /catalog and POST /api/hash endpoints.</p>
      <ul>
        <li>Algorithms: SHA-256, SHA-512, SHA-1, MD5</li>
        <li>Input: utf8 or hex (max 1 MB)</li>
        <li>Output: hex + base64 digests</li>
      </ul>
    </main>
  );
}
