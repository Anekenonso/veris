/**
 * Internal Client for the bound arc-escrow service on Vercel
 * Injected automatically by Vercel at runtime via ARC_ESCROW_SERVICE_URL binding.
 */

export function getArcEscrowServiceUrl(): string | undefined {
  return process.env.ARC_ESCROW_SERVICE_URL;
}

export async function callArcEscrowService(
  endpoint: string,
  init?: RequestInit
): Promise<Response> {
  const baseUrl = process.env.ARC_ESCROW_SERVICE_URL;
  if (!baseUrl) {
    throw new Error(
      "ARC_ESCROW_SERVICE_URL is not defined. Ensure the Vercel service binding is configured in vercel.json."
    );
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  const targetUrl = new URL(cleanEndpoint, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);

  return fetch(targetUrl.toString(), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}
