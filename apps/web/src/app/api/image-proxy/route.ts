import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = [
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
  "lh3.googleusercontent.com",
  "lh4.googleusercontent.com",
  "lh5.googleusercontent.com",
  "lh6.googleusercontent.com",
  "res.cloudinary.com",
  "images.unsplash.com",
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  // Only allow HTTPS and only from the allowlisted hosts (SSRF prevention)
  if (parsed.protocol !== "https:") {
    return new NextResponse("Only HTTPS URLs allowed", { status: 400 });
  }
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return new NextResponse("URL host not allowed", { status: 403 });
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return new NextResponse(`Failed to fetch image: ${response.statusText}`, {
        status: response.status,
      });
    }

    const contentType = response.headers.get("Content-Type") || "application/octet-stream";

    // Only serve image content types
    if (!contentType.startsWith("image/")) {
      return new NextResponse("Only image content types allowed", { status: 400 });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
