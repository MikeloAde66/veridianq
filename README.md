# Veridian Q

AI generative visual studio — Proto Labs Global.

Text-to-image, image-to-image, master-artist & optical-illusion presets, and
real rotatable 3D mesh generation. Built on Next.js + fal.ai.

## Setup

```bash
npm install
cp .env.example .env.local
# put your fal.ai key in .env.local as FAL_KEY=...
npm run dev
```

## Architecture

- `app/page.tsx` → `components/Studio.tsx` — the main UI (prompt, presets,
  text-to-image / image-to-image toggle, result view, 3D handoff).
- `app/api/generate-image/route.ts` — server route calling fal.ai Flux
  (text-to-image and image-to-image). The API key stays server-side.
- `app/api/generate-3d/route.ts` — server route calling fal.ai Trellis to
  turn a generated image into a real, rotatable glb mesh.
- `app/api/upload/route.ts` — uploads a user's source image to fal storage
  so the models (which need a public URL) can read it.
- `components/Viewer3D.tsx` — react-three-fiber viewer for the generated
  mesh (orbit controls, auto-rotate).
- `lib/presets.ts` — the artist / optical-illusion / book-cover / fine-art /
  commercial preset library. These are prompt-engineering modifiers, not
  CSS filters — they change what the model generates.

## Why this replaces the old prototype

The original `index.html` prototype applied CSS filters (`sepia()`,
`contrast()`, etc.) to a single uploaded photo and called a Gemini key
directly from the browser. This version actually generates new imagery and
3D geometry through production models, with the API key kept server-side.
The old prototype's panel layout and preset names are carried over as the
visual language, now wired to a real engine.

## Not included (by design)

True parametric CAD (dimensioned, constraint-based, exportable to
STEP/DWG) is out of scope here — see project notes. What this produces is
AI-generated imagery and meshes, including technical/blueprint-style
renders, not manufacturable CAD data.
