import { NextRequest, NextResponse } from "next/server";

// GET /api/image-proxy?url=<https url>
// Same-origin passthrough for generated images so the browser can read their
// pixels (canvas export / blob download) without depending on the CDN's CORS
// headers. Restricted to fal hosts so it can't be used as an open proxy.
const ALLOWED_SUFFIXES = ["fal.media", "fal.run", "fal.ai"];
const MAX_BYTES = 50 * 1024 * 1024;

function allowed(u: URL) {
  if (u.protocol !== "https:" || u.port) return false;
  return ALLOWED_SUFFIXES.some((s) => u.hostname === s || u.hostname.endsWith("." + s));
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  let target: URL;
  try {
    target = new URL(raw ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid url." }, { status: 400 });
  }
  if (!allowed(target)) {
    return NextResponse.json({ error: "Host not allowed." }, { status: 403 });
  }

  try {
    // redirect: "error" so an allowed host can't bounce us to an internal one.
    const upstream = await fetch(target, { redirect: "error" });
    if (!upstream.ok) {
      return NextResponse.json({ error: "Upstream fetch failed." }, { status: 502 });
    }
    const type = upstream.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) {
      return NextResponse.json({ error: "Not an image." }, { status: 415 });
    }
    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Image too large." }, { status: 413 });
    }
    return new NextResponse(buf, {
      headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return NextResponse.json({ error: "Proxy fetch failed." }, { status: 502 });
  }
}
