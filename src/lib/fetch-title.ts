/**
 * Best-effort fetch of a page's <title>. Browsers block cross-origin reads,
 * so we route through public read-only proxies and fall back to "" on any
 * failure (timeout, blocked, no title) — callers then use the hostname.
 */
export async function fetchPageTitle(
  url: string,
  signal?: AbortSignal,
): Promise<string> {
  const fromHtml = await tryProxy(
    `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    extractHtmlTitle,
    signal,
  );
  if (fromHtml) return fromHtml;

  // Reader proxy returns plain text with a "Title:" header line.
  return tryProxy(
    `https://r.jina.ai/${url}`,
    (text) => text.match(/^Title:\s*(.+)$/m)?.[1]?.trim() ?? "",
    signal,
  );
}

async function tryProxy(
  endpoint: string,
  parse: (text: string) => string,
  signal?: AbortSignal,
): Promise<string> {
  if (signal?.aborted) return "";
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 7000);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  try {
    const res = await fetch(endpoint, { signal: controller.signal });
    if (!res.ok) return "";
    return parse(await res.text()).slice(0, 120);
  } catch {
    return "";
  } finally {
    signal?.removeEventListener("abort", abort);
    window.clearTimeout(timeout);
  }
}

function extractHtmlTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (!match) return "";
  const el = document.createElement("textarea");
  el.innerHTML = match[1].trim();
  return el.value;
}
