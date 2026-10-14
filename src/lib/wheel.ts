/**
 * The names on a wheel, shared by the dashboard's wheel page. A name appears once per entry, so someone with two entries has two slices; the slices are
 * spread round the wheel instead of sitting side by side. Extra entries are typed one per line: `Name`, or `Name x3` for three entries. Mirrors what the
 * bot's /Spin Wheel does (WheelEntries.java), so the same list gives the same wheel in both places.
 */
export const MAX_ENTRIES = 300;
export const MAX_NAME = 40;
export const MAX_PER_LINE = 20;

export interface WheelEntry {
  name: string;
  entries: number;
}

export interface ParsedExtras {
  extras: WheelEntry[];
  problems: string[];
}

/** Reads typed extras. Blank lines are skipped; a bullet or number at the start of a line is ignored, so a pasted list works. */
export function parseExtras(text: string): ParsedExtras {
  const extras: WheelEntry[] = [];
  const problems: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/^(?:[-*•]|\d+[.)])\s+/, "");
    if (!line) continue;
    const m = /^(.*?)(?:\s*[xX×]\s*(\d{1,3}))?$/.exec(line);
    if (!m) continue;
    const name = m[1].trim();
    const count = m[2] ? Number(m[2]) : 1;
    if (!name) {
      problems.push(`"${line}" has no name.`);
    } else if (name.length > MAX_NAME) {
      problems.push(`"${name.slice(0, 20)}..." is longer than ${MAX_NAME} characters.`);
    } else if (count < 1 || count > MAX_PER_LINE) {
      problems.push(`"${name}" can have between 1 and ${MAX_PER_LINE} entries.`);
    } else {
      extras.push({ name, entries: count });
    }
  }
  return { extras, problems };
}

/** Adds entries for a name, matching an existing one case-insensitively. */
export function addEntries(list: WheelEntry[], name: string, entries: number): WheelEntry[] {
  const key = name.trim().toLowerCase();
  const found = list.findIndex((e) => e.name.toLowerCase() === key);
  if (found < 0) return [...list, { name: name.trim(), entries }];
  return list.map((e, i) => (i === found ? { ...e, entries: e.entries + entries } : e));
}

export function totalEntries(list: WheelEntry[]): number {
  return list.reduce((sum, e) => sum + e.entries, 0);
}

/** One label per slice, in drawing order: a name with several entries is spread over the wheel. */
export function spread(list: WheelEntry[]): string[] {
  const slots: { position: number; order: number; name: string }[] = [];
  list.forEach((e, order) => {
    for (let j = 0; j < e.entries; j++) slots.push({ position: (j + 0.5) / e.entries, order, name: e.name });
  });
  slots.sort((a, b) => a.position - b.position || a.order - b.order);
  return slots.map((s) => s.name);
}

/** A fair whole number in [0, n) from the browser's secure random source. */
export function secureIndex(n: number): number {
  if (n <= 1) return 0;
  const range = 0x100000000;
  const limit = range - (range % n);
  const buffer = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);
  return value % n;
}

/** The angle (radians, clockwise) the wheel must end at so the pointer at the top rests inside slice `winner`, `inside` (0..1) of the way across it. */
export function endAngle(winner: number, slices: number, inside: number): number {
  return -(winner + inside) * ((2 * Math.PI) / slices);
}

/** Which slice the pointer is on when the wheel has turned to `angle`. */
export function sliceAtPointer(slices: number, angle: number): number {
  const slice = (2 * Math.PI) / slices;
  let a = -angle % (2 * Math.PI);
  if (a < 0) a += 2 * Math.PI;
  return Math.floor(a / slice) % slices;
}

export const COLOURS = ["#3369e8", "#d50f25", "#eeb211", "#009925"];

export function colourFor(i: number, n: number): string {
  let index = i % COLOURS.length;
  if (n % COLOURS.length === 1 && i === n - 1) index = (index + 1) % COLOURS.length;
  return COLOURS[index];
}

/** Draws the wheel into a canvas context of `size` x `size` CSS pixels (already scaled for the screen). */
export function drawWheel(ctx: CanvasRenderingContext2D, size: number, labels: string[], angle: number, winner: number, text: string): void {
  const n = labels.length;
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2 + 8;
  const radius = size / 2 - 22;
  const slice = (2 * Math.PI) / n;
  for (let i = 0; i < n; i++) {
    const start = angle + i * slice - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + slice);
    ctx.closePath();
    ctx.fillStyle = colourFor(i, n);
    ctx.globalAlpha = winner >= 0 && i !== winner ? 0.45 : 1;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const arc = radius * 0.62 * slice;
  const fontSize = Math.max(9, Math.min(26, arc * 0.62));
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "right";
  const room = radius - 12 - radius * 0.2;
  for (let i = 0; i < n; i++) {
    let label = labels[i];
    while (ctx.measureText(label).width > room && label.length > 3) label = label.slice(0, -1);
    if (label !== labels[i]) label = `${label.trimEnd()}…`;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle + (i + 0.5) * slice - Math.PI / 2);
    ctx.fillStyle = winner >= 0 && i !== winner ? "rgba(255,255,255,0.55)" : "#fff";
    ctx.fillText(label, radius - 12, 0);
    ctx.restore();
  }
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#2b2f38";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
  ctx.stroke();
  const hub = Math.max(18, radius * 0.1);
  ctx.beginPath();
  ctx.arc(cx, cy, hub, 0, 2 * Math.PI);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();
  // pointer at the top
  const tip = cy - radius + 14;
  ctx.beginPath();
  ctx.moveTo(cx - 15, tip - 34);
  ctx.lineTo(cx + 15, tip - 34);
  ctx.lineTo(cx, tip);
  ctx.closePath();
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#15171c";
  ctx.stroke();
  if (text) {
    ctx.save();
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.fillText(text, cx, size - 6);
    ctx.restore();
  }
}
