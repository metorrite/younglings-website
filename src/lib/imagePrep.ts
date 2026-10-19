/**
 * Gets a picture ready to upload, in the browser: shrinks it to the size it will actually be shown at and, when that still leaves a
 * large file, re-encodes it more compactly. A logo straight from an artist is often several megabytes for a spot that shows it at a
 * few hundred pixels, and a big upload is the one most likely to stall on the way. Transparency is kept (PNG and WebP both carry it).
 *
 * Anything it can't improve is returned as it was: GIFs (they may be animated), pictures already small, and any picture the browser
 * can't decode. This is a convenience, never a reason to refuse a file; the bot still checks what arrives.
 */

/** The longest side worth keeping, by place: what Discord shows each at, with room to spare for sharp screens. */
const MAX_SIDE: Record<string, number> = { thumbnail: 256, author_icon: 128, footer_icon: 128, image: 1024, avatar: 512, banner: 1280 };

/** A picture this small is sent as it is. */
const SMALL_ENOUGH = 300 * 1024;

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Halves repeatedly until one more halving would overshoot, then makes the last step: thin lines stay solid instead of breaking into dots. */
function shrink(source: ImageBitmap, width: number, height: number): HTMLCanvasElement {
  let current: CanvasImageSource = source;
  let w = source.width;
  let h = source.height;
  let canvas = document.createElement("canvas");

  while (w > width || h > height) {
    w = Math.max(width, Math.ceil(w / 2));
    h = Math.max(height, Math.ceil(h / 2));
    canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no canvas");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(current, 0, 0, w, h);
    current = canvas;
  }
  return canvas;
}

export async function prepareImage(file: File, slot: string): Promise<File> {
  const limit = MAX_SIDE[slot];
  if (!limit || !/^image\/(png|jpeg|webp)$/.test(file.type)) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, limit / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= SMALL_ENOUGH) {
      bitmap.close();
      return file;
    }

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = scale < 1 ? shrink(bitmap, width, height) : (() => {
      const plain = document.createElement("canvas");
      plain.width = width;
      plain.height = height;
      plain.getContext("2d")?.drawImage(bitmap, 0, 0);
      return plain;
    })();
    bitmap.close();

    // A JPEG stays a JPEG. Anything else is kept as PNG, or as WebP (which carries transparency too) when that is clearly smaller.
    const candidates: Blob[] = [];
    if (file.type === "image/jpeg") {
      const jpeg = await toBlob(canvas, "image/jpeg", 0.9);
      if (jpeg) candidates.push(jpeg);
    } else {
      const png = await toBlob(canvas, "image/png");
      if (png) candidates.push(png);
      if (!png || png.size > SMALL_ENOUGH) {
        const webp = await toBlob(canvas, "image/webp", 0.92);
        if (webp && webp.type === "image/webp") candidates.push(webp);
      }
    }

    const best = candidates.sort((a, b) => a.size - b.size)[0];
    if (!best || (scale === 1 && best.size >= file.size)) return file;
    if (best.size >= file.size && best.type === file.type) return file;

    const extension = best.type === "image/jpeg" ? "jpg" : best.type === "image/webp" ? "webp" : "png";
    return new File([best], `${file.name.replace(/\.[^.]+$/, "") || "picture"}.${extension}`, { type: best.type });
  } catch {
    return file;
  }
}
