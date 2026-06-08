import { NextResponse } from "next/server";

// Best-effort on-site reader: fetch an article and pull its hero image +
// readable paragraphs so the News reader modal can show it without leaving the
// site. Many sites block bots / render via JS — then we just return what we can
// (image + description) and the client falls back to the feed summary + a link.

export const runtime = "nodejs";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function meta(html: string, key: string): string {
  const a = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  const b = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
    "i"
  );
  return decode((html.match(a)?.[1] || html.match(b)?.[1] || "").trim());
}

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url") || "";
  if (!/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: "bad url" }, { status: 400 });
  }
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: AbortSignal.timeout(8000),
      // don't let Next cache giant article HTML forever
      cache: "no-store",
    });
    const html = await res.text();

    const image = meta(html, "og:image") || meta(html, "twitter:image") || null;
    const siteName = meta(html, "og:site_name") || null;
    const desc = meta(html, "og:description") || meta(html, "description") || "";

    // Prefer text inside <article>; fall back to the whole document.
    const article = html.match(/<article[\s\S]*?<\/article>/i)?.[0];
    const scope = article && article.length > 600 ? article : html;

    const paragraphs: string[] = [];
    const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(scope)) && paragraphs.length < 14) {
      const txt = decode(m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
      if (txt.length > 60 && !/^(advertisement|sign up|subscribe|cookie)/i.test(txt)) {
        paragraphs.push(txt);
      }
    }

    return NextResponse.json({ image, siteName, desc, paragraphs });
  } catch {
    return NextResponse.json({ image: null, siteName: null, desc: "", paragraphs: [] });
  }
}
