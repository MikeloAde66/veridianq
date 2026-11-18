import { NextRequest, NextResponse } from "next/server";
import { fal, MODELS } from "@/lib/fal";


// POST /api/generate-3d
// body: { imageUrl: string }
// Turns a 2D image into a real, rotatable 3D mesh (glb) via fal.ai Trellis.
export async function POST(request: NextRequest) {
  if (!process.env.FAL_KEY) {
    return NextResponse.json(
      { error: "FAL_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const imageUrl: string = body.imageUrl;

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    const result = await fal.subscribe(MODELS.imageTo3D, {
      input: { image_url: imageUrl },
      logs: false,
    });

    const data = result.data as { model_mesh?: { url: string } };
    const meshUrl = data?.model_mesh?.url;

    if (!meshUrl) {
      return NextResponse.json({ error: "No mesh returned." }, { status: 502 });
    }

    return NextResponse.json({ meshUrl, requestId: result.requestId });
  } catch (err) {
    console.error("generate-3d failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "3D generation failed." },
      { status: 500 }
    );
  }
}
