import path from "node:path";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { applyPalette, GIFEncoder, quantize } from "gifenc";
import { drawWheel, endAngle } from "@/lib/wheel";

/**
 * The picture of the wheel spinning and stopping on a winner, drawn on the server with the very same code that draws the wheel on the dashboard
 * (`drawWheel`), so the GIF looks like the wheel the organiser watched. It spins for a few seconds, slows down and lands, then holds on the winner
 * for a moment (a GIF loops, so the hold is what stops it feeling like a flicker). Frames are packed closely while the wheel is fast and spread
 * out as it slows, so the motion stays smooth without wasting bytes.
 *
 * The bot has its own, simpler version of this for servers without the website; the website's is stored with the locked winner when there is one.
 */

/** Discord takes uploads up to about 10 MB, and the bot refuses a picture over 9 MB; stay a little under so a long list of names still fits. */
export const GIF_LIMIT_BYTES = 8_500_000;

const BACKGROUND = "#0b0d12";
/** Room under the wheel for the winner's name, so it isn't squeezed against the edge of the picture. */
const FOOTER = 44;
const TURNS = 3;
// The timing is the same as the bot's own wheel GIF (WheelSpin.java) so the two look alike: a short pause on the still wheel, a 3.5 second spin, a short hold. About five seconds in all.
const INITIAL_PAUSE_MS = 300;
const SPIN_MS = 3500;
const EASE_POWER = 2.6;
const MAX_STEP_RADIANS = 0.1;
const MIN_FRAME_MS = 20;
const MAX_FRAME_MS = 60;
const HOLD_MS = 1200;
/** The colour table slot that means "the same as the frame before". */
const TRANSPARENT = 255;
/** Largest first: a picture that is too big for Discord is redrawn smaller. */
const SIZES = [800, 720, 640, 560, 480];

let fontReady: string | null = null;

/** Inter, bundled with the site, so the picture looks the same wherever the website runs (a server rarely has the fonts a laptop has). */
function fontFamily(): string {
  if (fontReady) return fontReady;
  const file = path.join(process.cwd(), "node_modules", "@fontsource", "inter", "files", "inter-latin-700-normal.woff");
  const registered = GlobalFonts.registerFromPath(file, "WheelInter");
  fontReady = registered ? "WheelInter, sans-serif" : "sans-serif";
  return fontReady;
}

/** Angle of the wheel `ms` after it started turning: it starts fast and slows to a stop at `end`. */
export function angleAt(start: number, end: number, ms: number): number {
  const t = Math.min(1, Math.max(0, ms / SPIN_MS));
  return start + (end - start) * (1 - Math.pow(1 - t, EASE_POWER));
}

/** How fast the wheel is turning (radians per millisecond) `ms` after it started. */
function speedAt(start: number, end: number, ms: number): number {
  const t = Math.min(1, Math.max(0, ms / SPIN_MS));
  return Math.abs(((end - start) * EASE_POWER * Math.pow(1 - t, EASE_POWER - 1)) / SPIN_MS);
}

/** When each spin frame is shown, in milliseconds from the start: close together while the wheel is fast, apart as it slows. */
export function frameTimes(start: number, end: number): number[] {
  const times = [0];
  let t = 0;
  while (t < SPIN_MS) {
    const speed = Math.max(speedAt(start, end, t), 1e-6);
    t += Math.min(MAX_FRAME_MS, Math.max(MIN_FRAME_MS, MAX_STEP_RADIANS / speed));
    times.push(Math.min(t, SPIN_MS));
  }
  return times;
}

export interface WheelGif {
  gif: Buffer;
  size: number;
  frames: number;
}

/**
 * Draws the GIF for a wheel of `labels` (one per slice, as the dashboard shows them) landing on slice `winnerIndex`. `random` gives numbers in [0, 1)
 * for where it starts and which part of the winner's slice the pointer ends up on; tests pass their own.
 */
export function renderWheelGif(labels: string[], winnerIndex: number, random: () => number = Math.random): WheelGif {
  if (labels.length === 0 || winnerIndex < 0 || winnerIndex >= labels.length) throw new Error("The winner has to be one of the slices.");
  const family = fontFamily();
  let last: WheelGif | null = null;
  for (const size of SIZES) {
    last = draw(labels, winnerIndex, size, family, random);
    if (last.gif.length <= GIF_LIMIT_BYTES) return last;
  }
  return last as WheelGif;
}

function draw(labels: string[], winnerIndex: number, size: number, family: string, random: () => number): WheelGif {
  const height = size + FOOTER;
  const canvas = createCanvas(size, height);
  const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
  const look = { background: BACKGROUND, fontFamily: family, textY: size + 26 };
  const winnerName = labels[winnerIndex];

  const start = random() * 2 * Math.PI;
  const end = endAngle(winnerIndex, labels.length, 0.18 + random() * 0.64);
  const turns = Math.ceil((start + TURNS * 2 * Math.PI - end) / (2 * Math.PI));
  const target = end + turns * 2 * Math.PI;

  const frame = (angle: number, highlighted: boolean) => {
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, size, height);
    drawWheel(ctx, size, labels, angle, highlighted ? winnerIndex : -1, highlighted ? winnerName : "", look);
    return canvas.getContext("2d").getImageData(0, 0, size, height).data;
  };

  // one colour table for the whole spin, from a few samples (the wheel's colours never change while it turns), so the colours can't shimmer between frames
  const sampleAngles = [start, start + 1.1, start + 2.3, start + 3.7];
  const sample = new Uint8Array(sampleAngles.length * size * height * 4);
  sampleAngles.forEach((a, i) => sample.set(frame(a, false), i * size * height * 4));
  // 255 colours, with the last table slot kept free to mean "same as the frame before"
  const mapPalette = quantize(sample, 255, { format: "rgb565" });
  const spinPalette = [...mapPalette, [0, 0, 0]];

  const gif = GIFEncoder();
  const times = frameTimes(start, target);
  let written = 0;
  let previous: Uint8Array | null = null;
  for (let i = 0; i < times.length; i++) {
    const angle = angleAt(start, target, times[i]);
    const index = applyPalette(frame(angle, false), mapPalette, "rgb565");
    const next = i + 1 < times.length ? times[i + 1] : times[i] + MIN_FRAME_MS;
    // the very first frame waits a moment so the picture doesn't start already moving
    const ms = i === 0 ? INITIAL_PAUSE_MS : next - times[i];
    const delay = Math.max(2, Math.round(ms / 10));
    if (previous === null) {
      gif.writeFrame(index, size, height, { palette: spinPalette, delay, first: true });
    } else {
      // only what changed is stored: the middle of a slice looks the same from one frame to the next, so most of each frame is "unchanged"
      const changes = new Uint8Array(index.length);
      for (let p = 0; p < index.length; p++) changes[p] = index[p] === previous[p] ? TRANSPARENT : index[p];
      gif.writeFrame(changes, size, height, { palette: spinPalette, delay, transparent: true, transparentIndex: TRANSPARENT, dispose: 1 });
    }
    previous = index;
    written++;
  }
  // the winner, held: its own colour table, since the other slices are dimmed
  const finalPixels = frame(target, true);
  const finalPalette = quantize(finalPixels, 256, { format: "rgb565" });
  gif.writeFrame(applyPalette(finalPixels, finalPalette, "rgb565"), size, height, { palette: finalPalette, delay: Math.round(HOLD_MS / 10) });
  written++;
  gif.finish();
  return { gif: Buffer.from(gif.bytes()), size, frames: written };
}
