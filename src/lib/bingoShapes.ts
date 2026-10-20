/**
 * Bingo shapes in sizes of their own, mirroring the bot's BingoShapes: what each shape can be sized to and how many tiles it has, so the size pickers can
 * show a live sketch and a tile count without asking the bot. A size of 0 means the painted picture the shape has always had.
 */
export interface ShapeRange {
  id: string;
  /** What the size counts, in plain words. */
  what: string;
  min: number;
  max: number;
  /** The size the painted picture has (0 when the shape has no size that matches its picture). */
  picture: number;
  /** How many tiles the painted picture has. */
  pictureTiles: number;
}

export const SHAPE_RANGES: ShapeRange[] = [
  { id: "pyramid", what: "tiles along the base", min: 3, max: 8, picture: 5, pictureTiles: 15 },
  { id: "path", what: "tiles on the trail", min: 6, max: 40, picture: 24, pictureTiles: 24 },
  { id: "convergence", what: "rings around the boss", min: 1, max: 3, picture: 2, pictureTiles: 17 },
  { id: "tree", what: "levels", min: 3, max: 4, picture: 0, pictureTiles: 16 },
];

export const shapeRange = (id: string): ShapeRange | undefined => SHAPE_RANGES.find((r) => r.id === id);

/** Tiles on ring m of a convergence (1 is the innermost): 4, 12, 20. */
const ringTiles = (m: number) => 4 * (2 * m - 1);

/** How many tiles a shape has at a size (0 for the picture's own size). */
export function shapeTiles(id: string, size: number): number {
  const range = shapeRange(id);
  if (!range) return 0;
  if (size === 0) return range.pictureTiles;
  switch (id) {
    case "pyramid":
      return (size * (size + 1)) / 2;
    case "path":
      return size;
    case "convergence":
      return 1 + Array.from({ length: size }, (_, i) => ringTiles(i + 1)).reduce((a, b) => a + b, 0);
    default:
      return (1 << size) - 1;
  }
}

/** The tiles per row of the sketch, from the top down, or null for a convergence (drawn as rings). */
export function sketchRows(id: string, size: number): number[] | null {
  const range = shapeRange(id);
  if (!range) return null;
  const n = size === 0 ? (range.picture > 0 ? range.picture : 4) : size;
  switch (id) {
    case "pyramid":
      return Array.from({ length: n }, (_, i) => i + 1);
    case "path": {
      const total = size === 0 ? range.pictureTiles : size;
      return Array.from({ length: Math.ceil(total / 6) }, (_, i) => Math.min(6, total - i * 6));
    }
    case "tree":
      return size === 0 ? [1, 2, 6, 7] : Array.from({ length: size }, (_, i) => 1 << i);
    default:
      return null;
  }
}

/** The ring sizes of a convergence from the outside in, ending with the boss: 12, 4, 1 for two rings. */
export function sketchRings(size: number): number[] {
  const rings = size === 0 ? 2 : size;
  return [...Array.from({ length: rings }, (_, i) => ringTiles(rings - i)), 1];
}

/** What is wrong with a size, or null when it is fine (0 is always fine). */
export function shapeSizeProblem(id: string, size: number): string | null {
  if (size === 0) return null;
  const range = shapeRange(id);
  if (!range) return "That shape has no size to change.";
  if (!Number.isInteger(size) || size < range.min || size > range.max) return `A ${id} can have ${range.min} to ${range.max} ${range.what}.`;
  return null;
}
