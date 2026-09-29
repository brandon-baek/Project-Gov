export function GET() {
  return new Response("google.com, pub-7182652983612572, DIRECT, f08c47fec0942fa0\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}
