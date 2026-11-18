import { NextRequest, NextResponse } from "next/server";
import { fal, MODELS } from "@/lib/fal";


// POST /api/generate-image
// body: { prompt: string, imageUrl?: string, strength?: number }
// imageUrl present -> image-to-image, otherwise text-to-image.
export async function POST(request: NextRequest) {
  if (!process.env.FAL_KEY) {
    return NextResponse.json(
      { error: "FAL_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const prompt: string = (body.prompt || "").trim();
    const imageUrl: string | undefined = body.imageUrl;
    const strength: number = body.strength ?? 0.75;

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const model = imageUrl ? MODELS.imageToImage : MODELS.textToImage;
    const input: Record<string, unknown> = {
      prompt,
      num_images: 1,
      image_size: "square_hd",
    };
    if (imageUrl) {
      input.image_url = imageUrl;
      input.strength = strength;
    }

    // fal's generated types key the input shape off the literal model
    // string; we choose the model dynamically above (text vs. image mode),
    // so the exact union member can't be known at compile time.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (fal.subscribe as any)(model, {
      input,
      logs: false,
    });

    const images = (result.data as { images?: { url: string }[] })?.images ?? [];
    if (!images.length) {
      return NextResponse.json({ error: "No image returned." }, { status: 502 });
    }

    return NextResponse.json({ url: images[0].url, requestId: result.requestId });
  } catch (err) {
    console.error("generate-image failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed." },
      { status: 500 }
    );
  }
}
