export type Preset = {
  id: string;
  label: string;
  category: "Masters" | "Optical Illusion" | "Book Cover" | "Fine Art" | "Commercial";
  promptModifier: string;
};

// Presets are prompt-engineering layers, not filters — they shape what the
// generative model produces, not a CSS effect on top of a flat photo.
export const PRESETS: Preset[] = [
  // Masters
  {
    id: "davinci",
    label: "Da Vinci",
    category: "Masters",
    promptModifier:
      "in the style of Leonardo da Vinci, sfumato soft blended shadows, anatomical precision, warm umber underpainting, Renaissance composition",
  },
  {
    id: "rubens",
    label: "Rubens",
    category: "Masters",
    promptModifier:
      "in the style of Peter Paul Rubens, baroque dynamism, rich saturated color, dramatic fleshy modeling, swirling composition",
  },
  {
    id: "caravaggio",
    label: "Caravaggio",
    category: "Masters",
    promptModifier:
      "in the style of Caravaggio, tenebrism, single dramatic light source, deep black shadows, high realism",
  },
  {
    id: "michelangelo",
    label: "Michelangelo",
    category: "Masters",
    promptModifier:
      "in the style of Michelangelo, sculptural form, heroic anatomy, fresco color palette, classical idealism",
  },
  // Optical Illusion
  {
    id: "impossible-geometry",
    label: "Impossible Geometry",
    category: "Optical Illusion",
    promptModifier:
      "impossible object, Escher-style impossible geometry, paradoxical perspective, recursive architecture, optical illusion, mathematically precise linework",
  },
  {
    id: "anamorphic",
    label: "Anamorphic",
    category: "Optical Illusion",
    promptModifier:
      "anamorphic illusion, forced perspective, 3D chalk-art style distortion, trompe-l'oeil, photographed from the exact illusion angle",
  },
  {
    id: "double-exposure",
    label: "Double Exposure",
    category: "Optical Illusion",
    promptModifier:
      "double exposure illusion, figure-ground ambiguity, hidden silhouette within a landscape, seamless blend",
  },
  // Book Cover
  {
    id: "literary-cover",
    label: "Literary Cover",
    category: "Book Cover",
    promptModifier:
      "literary book cover composition, bold minimal typographic negative space, striking single focal image, award-winning cover design",
  },
  {
    id: "scifi-cover",
    label: "Sci-Fi Cover",
    category: "Book Cover",
    promptModifier:
      "science fiction book cover, epic scale, dramatic lighting, cinematic color grade, genre paperback composition",
  },
  // Fine Art
  {
    id: "gallery-print",
    label: "Gallery Print",
    category: "Fine Art",
    promptModifier:
      "fine art gallery print, museum lighting, archival print quality, painterly brushwork, gallery wall composition",
  },
  {
    id: "surreal-fine-art",
    label: "Surreal Fine Art",
    category: "Fine Art",
    promptModifier:
      "surrealist fine art, dreamlike juxtaposition, Dali-esque melting forms, symbolic imagery, museum quality",
  },
  // Commercial
  {
    id: "product-hero",
    label: "Product Hero",
    category: "Commercial",
    promptModifier:
      "commercial product photography, studio lighting, clean seamless background, advertising hero shot, high-end retouching",
  },
  {
    id: "brand-editorial",
    label: "Brand Editorial",
    category: "Commercial",
    promptModifier:
      "editorial brand campaign photography, fashion-magazine lighting, polished commercial color grade",
  },
];

export const PRESET_CATEGORIES = [
  "Masters",
  "Optical Illusion",
  "Book Cover",
  "Fine Art",
  "Commercial",
] as const;
