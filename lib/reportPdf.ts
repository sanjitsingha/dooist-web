import { groupByDay, type ActivityEvent, type ActivityKind } from "@/lib/activity";
import { formatActivityDay, fromDateKey, type DateKey } from "@/lib/dates";

/**
 * The Reporting log as a PDF, laid out like the page. Each page is drawn on a canvas, so todo
 * titles in any script, emoji included, come out as they do on screen. The trade-off is that
 * the PDF's text can't be selected.
 */

/** A4 at 96 dpi, so sizes match the page: 14px text prints at 10.5pt. */
const PAGE = { width: 794, height: 1123 };
/** A4 in PDF points. */
const PAGE_POINTS = { width: 595.28, height: 841.89 };
/** Drawn at twice the size, so the text stays sharp when printed. */
const SCALE = 2;
const MARGIN_X = 48;
const TOP = 48;
/** Where the first page's log starts, below the title and the filters. */
const FIRST_TOP = TOP + 104;
/** Rows stop here, leaving room for the page numbers. */
const BOTTOM = PAGE.height - 64;

/** The day's title line, its 8px gap and the rule under it. */
const HEADING = 29;
const ROW = 48;
/** The room above the first row and below the last. */
const LIST_PAD = 2;
const SECTION_GAP = 20;

/** Always the light look, since a PDF is mostly printed or sent on. Same values as globals.css. */
const COLORS = {
  page: "#ffffff",
  text: "#171717",
  muted: "#737373",
  line: "#e7e7e7",
  primary: "#fc5c2c",
  accentSoft: "#ffedd5",
  accentDark: "#c2410c",
  onStatus: "#ffffff",
};

const BADGE_COLORS: Record<ActivityKind, string> = {
  added: "#16a34a",
  updated: "#0369a1",
  completed: COLORS.primary,
  deleted: "#dc2626",
};

/** The same Lucide icons as the page (ISC license), as path data on a 24 by 24 grid. */
const CIRCLE = "M22 12a10 10 0 1 1-20 0a10 10 0 1 1 20 0";
const BADGE_ICONS: Record<ActivityKind, readonly string[]> = {
  added: ["M5 12h14", "M12 5v14"],
  updated: [
    "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
    "m15 5 4 4",
  ],
  completed: ["M20 6 9 17l-5-5"],
  deleted: [
    "M10 11v6",
    "M14 11v6",
    "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
    "M3 6h18",
    "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  ],
};
const TODO_ICON = [CIRCLE];
const DONE_TODO_ICON = [CIRCLE, "m16 9-5.5 5.5L8 12"];

export type ReportPdf = {
  /** Every row the filters let through, not only the page of them on screen. */
  events: readonly ActivityEvent[];
  today: DateKey;
  title: string;
  /** Muted lines under the title, such as the filters. */
  details: readonly string[];
  avatar: { url?: string; initial: string };
};

type Op =
  | { kind: "heading"; day: DateKey; count: number; y: number }
  | { kind: "row"; event: ActivityEvent; y: number }
  | { kind: "rule"; y: number };

/** Splits the days across pages. A day that runs over starts again under its title. */
function layOut(events: readonly ActivityEvent[]): Op[][] {
  const pages: Op[][] = [[]];
  let y = FIRST_TOP;
  const add = (op: Op) => pages[pages.length - 1].push(op);
  const newPage = () => {
    pages.push([]);
    y = TOP;
  };

  for (const { day, items } of groupByDay(events)) {
    const open = () => {
      add({ kind: "heading", day, count: items.length, y });
      y += HEADING + LIST_PAD;
    };
    const close = () => {
      add({ kind: "rule", y: y + LIST_PAD });
      y += LIST_PAD + 1;
    };
    const fits = (height: number) => y + height + LIST_PAD + 1 <= BOTTOM;

    if (!fits(HEADING + LIST_PAD + ROW)) newPage();
    open();
    for (const event of items) {
      if (!fits(ROW)) {
        close();
        newPage();
        open();
      }
      add({ kind: "row", event, y });
      y += ROW;
    }
    close();
    y += SECTION_GAP;
  }
  return pages;
}

const graphemes = (text: string) =>
  typeof Intl.Segmenter === "function"
    ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), (part) => part.segment)
    : Array.from(text);

/** The text, cut short with an ellipsis if it's wider than `maxWidth`, like the page does. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const parts = graphemes(text);
  const cut = (count: number) => `${parts.slice(0, count).join("").trimEnd()}…`;
  let low = 0;
  let high = parts.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (ctx.measureText(cut(mid)).width <= maxWidth) low = mid;
    else high = mid - 1;
  }
  return cut(low);
}

/** Where to put the baseline so a line of the current font is centered on `centerY`, as CSS does. */
function baselineFor(ctx: CanvasRenderingContext2D, centerY: number): number {
  const { fontBoundingBoxAscent: ascent, fontBoundingBoxDescent: descent } = ctx.measureText("Hg");
  return centerY + (ascent - descent) / 2;
}

function drawIcon(
  ctx: CanvasRenderingContext2D,
  paths: readonly string[],
  x: number,
  y: number,
  size: number,
  color: string,
  strokeWidth: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const path of paths) ctx.stroke(new Path2D(path));
  ctx.restore();
}

/** The profile picture, or null if it can't be had. It needs the site's permission to be drawn. */
async function loadAvatar(url: string | undefined): Promise<HTMLImageElement | null> {
  if (!url) return null;
  const image = new Image();
  image.crossOrigin = "anonymous";
  // Google refuses some profile pictures when told which site is asking.
  image.referrerPolicy = "no-referrer";
  image.src = url;
  const giveUp = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
  return Promise.race([image.decode().then(() => image, () => null), giveUp]);
}

type Painter = {
  ctx: CanvasRenderingContext2D;
  font: (weight: number, size: number) => string;
  now: Date;
  avatar: HTMLImageElement | null;
  initial: string;
};

function drawHeader({ ctx, font }: Painter, title: string, details: readonly string[]) {
  ctx.font = font(600, 28);
  ctx.letterSpacing = "-0.8px";
  ctx.fillStyle = COLORS.text;
  ctx.fillText(fitText(ctx, title, PAGE.width - MARGIN_X * 2), MARGIN_X, baselineFor(ctx, TOP + 18));
  ctx.letterSpacing = "0px";

  ctx.font = font(400, 13);
  ctx.fillStyle = COLORS.muted;
  details.slice(0, 2).forEach((line, index) => {
    const centerY = TOP + 36 + 17 + index * 18;
    ctx.fillText(fitText(ctx, line, PAGE.width - MARGIN_X * 2), MARGIN_X, baselineFor(ctx, centerY));
  });
}

function drawHeading({ ctx, font, now }: Painter, day: DateKey, count: number, y: number) {
  const x = MARGIN_X + 2;
  ctx.font = font(700, 14);
  ctx.fillStyle = COLORS.text;
  const baseline = baselineFor(ctx, y + 10);
  const label = formatActivityDay(day, now);
  ctx.fillText(label, x, baseline);
  const labelWidth = ctx.measureText(label).width;

  ctx.font = font(400, 14);
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(count.toLocaleString(), x + labelWidth + 8, baseline);

  drawRule(ctx, y + HEADING - 1);
}

function drawRule(ctx: CanvasRenderingContext2D, y: number) {
  ctx.fillStyle = COLORS.line;
  ctx.fillRect(MARGIN_X, y, PAGE.width - MARGIN_X * 2, 1);
}

function drawAvatar({ ctx, font, avatar, initial }: Painter, centerX: number, centerY: number) {
  const radius = 14;
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.clip();
  if (avatar) {
    const { naturalWidth: width, naturalHeight: height } = avatar;
    const side = Math.min(width, height);
    ctx.drawImage(
      avatar,
      (width - side) / 2,
      (height - side) / 2,
      side,
      side,
      centerX - radius,
      centerY - radius,
      radius * 2,
      radius * 2,
    );
  } else {
    ctx.fillStyle = COLORS.accentSoft;
    ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
    ctx.font = font(600, 12);
    ctx.fillStyle = COLORS.accentDark;
    ctx.textAlign = "center";
    ctx.fillText(initial, centerX, baselineFor(ctx, centerY));
  }
  ctx.restore();
}

/** The avatar with the action's badge, "You completed", and the todo's chip. */
function drawRow(painter: Painter, event: ActivityEvent, y: number) {
  const { ctx, font } = painter;
  const centerY = y + ROW / 2;
  const left = MARGIN_X + 8;
  const right = PAGE.width - MARGIN_X - 8;

  drawAvatar(painter, left + 14, centerY);
  // A 16px badge over the avatar's corner, inside a 2px ring the color of the page.
  const badgeX = left + 24;
  const badgeY = centerY + 10;
  ctx.fillStyle = COLORS.page;
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BADGE_COLORS[event.kind];
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, 6, 0, Math.PI * 2);
  ctx.fill();
  drawIcon(ctx, BADGE_ICONS[event.kind], badgeX - 4, badgeY - 4, 8, COLORS.onStatus, 3.5);

  ctx.font = font(400, 14);
  ctx.fillStyle = COLORS.text;
  const baseline = baselineFor(ctx, centerY);
  const action = `You ${event.kind}`;
  const actionX = left + 28 + 10 + 2;
  ctx.fillText(action, actionX, baseline);

  // The chip: a 1px border, 8px either side, a 14px circle, then the title.
  const chipX = actionX + ctx.measureText(action).width + 10;
  const textX = chipX + 1 + 8 + 14 + 6;
  const deleted = event.kind === "deleted";
  const title = fitText(ctx, event.title.replace(/\s+/g, " ").trim(), right - textX - 8 - 1);
  const titleWidth = ctx.measureText(title).width;
  const chipWidth = textX - chipX + titleWidth + 8 + 1;

  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(chipX + 0.5, centerY - 14 + 0.5, chipWidth - 1, 27, 5);
  ctx.stroke();

  const done = event.kind === "completed";
  drawIcon(
    ctx,
    done ? DONE_TODO_ICON : TODO_ICON,
    chipX + 9,
    centerY - 7,
    14,
    done ? COLORS.primary : COLORS.muted,
    2,
  );

  ctx.fillStyle = deleted ? COLORS.muted : COLORS.text;
  ctx.fillText(title, textX, baseline);
  if (deleted) ctx.fillRect(textX, Math.round(centerY), titleWidth, 1);
}

function drawFooter({ ctx, font }: Painter, page: number, pageCount: number) {
  ctx.font = font(400, 11);
  ctx.fillStyle = COLORS.muted;
  const baseline = baselineFor(ctx, PAGE.height - 32);
  ctx.fillText("Dooist", MARGIN_X, baseline);
  ctx.textAlign = "right";
  ctx.fillText(`Page ${page} of ${pageCount}`, PAGE.width - MARGIN_X, baseline);
  ctx.textAlign = "left";
}

/** The canvas's pixels, without their alpha, compressed the way a PDF reads them. */
async function pageImage(ctx: CanvasRenderingContext2D): Promise<Uint8Array<ArrayBuffer>> {
  const { width, height } = ctx.canvas;
  const rgba = ctx.getImageData(0, 0, width, height).data;
  const rgb = new Uint8Array(width * height * 3);
  for (let from = 0, to = 0; from < rgba.length; from += 4, to += 3) {
    rgb[to] = rgba[from];
    rgb[to + 1] = rgba[from + 1];
    rgb[to + 2] = rgba[from + 2];
  }
  const stream = new Blob([rgb]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** A PDF with one full-page picture per page. */
function writePdf(
  pages: readonly Uint8Array<ArrayBuffer>[],
  pixels: { width: number; height: number },
  title: string,
): Blob {
  const encoder = new TextEncoder();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  const offsets: number[] = [];
  let length = 0;
  const write = (part: string | Uint8Array<ArrayBuffer>) => {
    const bytes = typeof part === "string" ? encoder.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (id: number, dictionary: string, stream?: Uint8Array<ArrayBuffer>) => {
    offsets[id] = length;
    write(`${id} 0 obj\n${dictionary}\n`);
    if (stream) {
      write("stream\n");
      write(stream);
      write("\nendstream\n");
    }
    write("endobj\n");
  };
  // A PDF's title is written between brackets, so those and backslashes are escaped.
  const pdfText = (text: string) => text.replace(/[^\x20-\x7e]/g, "").replace(/[\\()]/g, "\\$&");

  // The header, then a comment of non-ASCII bytes that marks the file as binary.
  write("%PDF-1.4\n");
  write(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  const { width, height } = PAGE_POINTS;
  const pageId = (index: number) => 3 + index * 3;
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(
    2,
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${pageId(index)} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  );
  pages.forEach((image, index) => {
    const id = pageId(index);
    object(
      id,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`,
    );
    object(
      id + 1,
      `<< /Type /XObject /Subtype /Image /Width ${pixels.width} /Height ${pixels.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${image.length} >>`,
      image,
    );
    const draw = encoder.encode(`q ${width} 0 0 ${height} 0 0 cm /Im Do Q`);
    object(id + 2, `<< /Length ${draw.length} >>`, draw);
  });
  const infoId = pageId(pages.length);
  object(infoId, `<< /Title (${pdfText(title)}) /Producer (Dooist) >>`);

  const xref = length;
  const size = infoId + 1;
  const entries = offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  write(`xref\n0 ${size}\n0000000000 65535 f \n${entries}`);
  write(`trailer\n<< /Size ${size} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks, { type: "application/pdf" });
}

export async function createReportPdf(report: ReportPdf): Promise<Blob> {
  // The page's own font, Geist, with the same fallbacks for other scripts.
  const family = getComputedStyle(document.body).fontFamily;
  const font = (weight: number, size: number) => `${weight} ${size}px ${family}`;
  await Promise.all([400, 600, 700].map((weight) => document.fonts.load(font(weight, 14)))).catch(
    () => undefined,
  );

  const canvas = document.createElement("canvas");
  canvas.width = PAGE.width * SCALE;
  canvas.height = PAGE.height * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't draw the PDF.");

  const painter: Painter = {
    ctx,
    font,
    now: fromDateKey(report.today),
    avatar: await loadAvatar(report.avatar.url),
    initial: report.avatar.initial,
  };
  const pages = layOut(report.events);
  const images: Uint8Array<ArrayBuffer>[] = [];
  for (const [index, ops] of pages.entries()) {
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = COLORS.page;
    ctx.fillRect(0, 0, PAGE.width, PAGE.height);

    if (index === 0) drawHeader(painter, report.title, report.details);
    for (const op of ops) {
      if (op.kind === "heading") drawHeading(painter, op.day, op.count, op.y);
      else if (op.kind === "row") drawRow(painter, op.event, op.y);
      else drawRule(ctx, op.y);
    }
    drawFooter(painter, index + 1, pages.length);
    images.push(await pageImage(ctx));
  }
  return writePdf(images, { width: canvas.width, height: canvas.height }, report.title);
}
