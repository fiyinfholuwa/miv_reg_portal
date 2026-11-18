import QRCodeGenerator from 'qrcode';

/**
 * Draws the shareable "I will be attending" card (1080×1350, Instagram portrait)
 * on a canvas and returns it as a PNG. Pure browser code, no React.
 *
 * Layout follows the blue/yellow event-flyer style: logo badge and event tag on
 * top, a two-line headline, a glowing photo frame with a date pill on the left
 * and a yellow name tag, and an info bar (location · QR · link · call to action).
 */
export type CardDetails = {
  name: string;
  eventTitle: string;
  dateLabel: string;
  startsAt?: string | null;
  location: string | null;
  eventUrl: string;
  photoUrl: string | null;
};

const WIDTH = 1080;
const HEIGHT = 1350;
const COLORS = {
  deep: '#050f5c',
  navy: '#0a1a8a',
  royal: '#1746d8',
  bright: '#1f7bff',
  yellow: '#f2e22c',
  white: '#ffffff',
  ink: '#07124d',
  soft: '#c9d6ff',
};

type Context = CanvasRenderingContext2D;
const font = (weight: number, size: number) => `${weight} ${size}px Barlow, 'Helvetica Neue', Arial, sans-serif`;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

/** Split text into lines that fit a width (last line ellipsised past maxLines). */
function lines(context: Context, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const result: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      result.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) result.push(line);
  const shown = result.slice(0, maxLines);
  if (result.length > maxLines) shown[maxLines - 1] = `${shown[maxLines - 1].replace(/\s+\S*$/, '')}…`;
  return shown;
}

/** Largest font size (down to min) at which text fits maxLines. */
function fitLines(context: Context, text: string, weight: number, size: number, min: number, maxWidth: number, maxLines: number) {
  for (let current = size; current >= min; current -= 2) {
    context.font = font(weight, current);
    const fitted = lines(context, text, maxWidth, maxLines);
    if (!fitted.some((line) => line.endsWith('…')) && fitted.every((line) => context.measureText(line).width <= maxWidth)) return { size: current, lines: fitted };
  }
  context.font = font(weight, min);
  return { size: min, lines: lines(context, text, maxWidth, maxLines) };
}

/** Small deterministic random so the background pattern is identical every render. */
function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function drawBackground(context: Context) {
  const base = context.createLinearGradient(0, 0, WIDTH, HEIGHT);
  base.addColorStop(0, COLORS.navy);
  base.addColorStop(0.55, COLORS.deep);
  base.addColorStop(1, '#03093d');
  context.fillStyle = base;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  // Broad flowing ribbons.
  context.save();
  context.lineCap = 'round';
  const ribbon = (width: number, color: string, points: number[]) => {
    context.strokeStyle = color;
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(points[0], points[1]);
    for (let index = 2; index < points.length; index += 6) {
      context.bezierCurveTo(points[index], points[index + 1], points[index + 2], points[index + 3], points[index + 4], points[index + 5]);
    }
    context.stroke();
  };
  ribbon(150, 'rgba(46,96,240,.45)', [-120, 120, 120, -40, 60, 420, 260, 470, 520, 540, 820, 260, 1200, 420]);
  ribbon(130, 'rgba(56,110,255,.35)', [-150, 900, 160, 700, 280, 1100, 520, 1010, 760, 920, 900, 520, 1220, 640]);
  ribbon(70, 'rgba(120,160,255,.18)', [1180, 80, 980, 260, 1120, 520, 940, 760, 820, 930, 1020, 1120, 1200, 1300]);
  ribbon(90, 'rgba(40,80,220,.35)', [-120, 1400, 200, 1220, 420, 1420, 700, 1300, 900, 1210, 1050, 1300, 1200, 1250]);
  context.restore();

  // Soft vignette to keep the edges dark.
  const vignette = context.createRadialGradient(WIDTH / 2, HEIGHT / 2, 300, WIDTH / 2, HEIGHT / 2, 900);
  vignette.addColorStop(0, 'rgba(3,9,61,0)');
  vignette.addColorStop(1, 'rgba(3,9,61,.55)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, WIDTH, HEIGHT);
}

/** White diagonal stripes inside a rectangle. */
function drawStripes(context: Context, x: number, y: number, width: number, height: number, background: string) {
  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  context.fillStyle = background;
  context.fillRect(x, y, width, height);
  context.strokeStyle = COLORS.white;
  context.lineWidth = 4;
  for (let offset = -height; offset < width + height; offset += 13) {
    context.beginPath();
    context.moveTo(x + offset, y + height);
    context.lineTo(x + offset + height, y);
    context.stroke();
  }
  context.restore();
}

/** Light doodle pattern for the photo frame background. */
function drawDoodles(context: Context, x: number, y: number, width: number, height: number) {
  const random = seeded(7);
  context.save();
  context.strokeStyle = 'rgba(255,255,255,.16)';
  context.fillStyle = 'rgba(255,255,255,.14)';
  context.lineWidth = 5;
  context.lineCap = 'round';
  for (let index = 0; index < 70; index += 1) {
    const cx = x + random() * width;
    const cy = y + random() * height;
    const size = 10 + random() * 22;
    const kind = Math.floor(random() * 4);
    context.beginPath();
    if (kind === 0) context.arc(cx, cy, size, 0, Math.PI * 2);
    else if (kind === 1) context.arc(cx, cy, size, random() * Math.PI, random() * Math.PI + Math.PI);
    else if (kind === 2) {
      context.moveTo(cx - size, cy);
      context.quadraticCurveTo(cx, cy - size, cx + size, cy);
    } else {
      context.arc(cx, cy, 4, 0, Math.PI * 2);
      context.fill();
      continue;
    }
    context.stroke();
  }
  context.restore();
}

function drawPhotoFrame(context: Context, photo: HTMLImageElement | null, x: number, y: number, width: number, height: number, radius: number) {
  // Glow.
  context.save();
  context.shadowColor = 'rgba(70,150,255,.9)';
  context.shadowBlur = 70;
  context.fillStyle = COLORS.bright;
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
  context.restore();

  context.save();
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.clip();
  const fill = context.createLinearGradient(x, y, x + width, y + height);
  fill.addColorStop(0, '#2b8cff');
  fill.addColorStop(1, '#1257e6');
  context.fillStyle = fill;
  context.fillRect(x, y, width, height);
  drawDoodles(context, x, y, width, height);

  if (photo) {
    // Cover-crop from the top so heads are never cut off.
    const scale = Math.max(width / photo.width, height / photo.height);
    const sourceWidth = width / scale;
    const sourceHeight = height / scale;
    context.drawImage(photo, (photo.width - sourceWidth) / 2, 0, sourceWidth, sourceHeight, x, y, width, height);
    const shade = context.createLinearGradient(0, y + height * 0.65, 0, y + height);
    shade.addColorStop(0, 'rgba(5,15,92,0)');
    shade.addColorStop(1, 'rgba(5,15,92,.45)');
    context.fillStyle = shade;
    context.fillRect(x, y, width, height);
  } else {
    context.fillStyle = 'rgba(255,255,255,.9)';
    context.font = font(600, 34);
    context.textAlign = 'center';
    context.fillText('Add your photo', x + width / 2, y + height / 2);
    context.textAlign = 'left';
  }
  context.restore();

  context.strokeStyle = 'rgba(160,205,255,.7)';
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.stroke();
}

function ordinal(day: number) {
  const suffix = day % 100 >= 11 && day % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][day % 10] ?? 'th';
  return `${day}${suffix}`;
}

/** Three short lines for the date pill, e.g. ["4th", "July", "2026"]. */
function dateParts(startsAt: string | null | undefined, dateLabel: string): [string, string, string] | null {
  if (startsAt) {
    const date = new Date(startsAt);
    if (!Number.isNaN(date.getTime())) {
      const zone = { timeZone: 'Africa/Lagos' } as const;
      const day = Number(new Intl.DateTimeFormat('en-GB', { ...zone, day: 'numeric' }).format(date));
      return [ordinal(day), new Intl.DateTimeFormat('en-GB', { ...zone, month: 'long' }).format(date), new Intl.DateTimeFormat('en-GB', { ...zone, year: 'numeric' }).format(date)];
    }
  }
  if (!dateLabel || dateLabel === 'Date TBA') return null;
  const words = dateLabel.replace(/,/g, '').split(/\s+/).filter(Boolean);
  if (words.length >= 3) return [words[0], words[1], words.slice(2).join(' ')];
  return null;
}

function drawDatePill(context: Context, parts: [string, string, string] | null, dateLabel: string, x: number, y: number) {
  const width = 104;
  const stripeHeight = 52;
  const bodyHeight = 140;
  drawStripes(context, x, y, width, stripeHeight, '#0b2fb0');

  context.save();
  context.shadowColor = 'rgba(40,120,255,.7)';
  context.shadowBlur = 30;
  const body = context.createLinearGradient(x, y + stripeHeight, x, y + stripeHeight + bodyHeight);
  body.addColorStop(0, COLORS.bright);
  body.addColorStop(1, COLORS.royal);
  context.fillStyle = body;
  context.beginPath();
  context.roundRect(x, y + stripeHeight, width, bodyHeight, [0, 0, 16, 16]);
  context.fill();
  context.restore();

  context.textAlign = 'center';
  const centre = x + width / 2;
  if (parts) {
    context.fillStyle = COLORS.yellow;
    context.font = font(700, 32);
    context.fillText(parts[0], centre, y + stripeHeight + 40, width - 12);
    context.fillText(parts[1], centre, y + stripeHeight + 78, width - 12);
    context.fillStyle = COLORS.white;
    context.fillText(parts[2], centre, y + stripeHeight + 116, width - 12);
  } else {
    context.fillStyle = COLORS.yellow;
    const fitted = fitLines(context, dateLabel || 'Date TBA', 700, 26, 18, width - 14, 4);
    fitted.lines.forEach((line, index) => context.fillText(line, centre, y + stripeHeight + 40 + index * (fitted.size + 4), width - 12));
  }
  context.textAlign = 'left';
}

function drawNameTag(context: Context, name: string, frameRight: number, bottom: number) {
  const fitted = fitLines(context, name || 'Your Name', 700, 36, 24, 260, 2);
  context.font = font(700, fitted.size);
  const textWidth = Math.max(...fitted.lines.map((line) => context.measureText(line).width));
  const lineHeight = fitted.size * 1.02;
  const width = 70 + textWidth + 28;
  const height = Math.max(76, fitted.lines.length * lineHeight + 26);
  const x = Math.min(frameRight + 90 - width, WIDTH - 40 - width);
  const y = bottom - height;

  context.save();
  context.shadowColor = 'rgba(0,0,0,.35)';
  context.shadowBlur = 18;
  context.shadowOffsetY = 6;
  context.fillStyle = COLORS.yellow;
  context.fillRect(x, y, width, height);
  context.restore();
  context.fillStyle = COLORS.bright;
  context.fillRect(x + width - 6, y, 6, height);

  // Verified badge.
  const badgeX = x + 36;
  const badgeY = y + height / 2;
  context.strokeStyle = COLORS.ink;
  context.lineWidth = 3;
  context.beginPath();
  for (let point = 0; point < 16; point += 1) {
    const angle = (Math.PI * 2 * point) / 16;
    const radius = point % 2 === 0 ? 17 : 13.5;
    context.lineTo(badgeX + Math.cos(angle) * radius, badgeY + Math.sin(angle) * radius);
  }
  context.closePath();
  context.stroke();
  context.lineWidth = 3.5;
  context.beginPath();
  context.moveTo(badgeX - 7, badgeY);
  context.lineTo(badgeX - 2, badgeY + 5);
  context.lineTo(badgeX + 8, badgeY - 6);
  context.stroke();

  context.fillStyle = COLORS.ink;
  context.textBaseline = 'middle';
  const firstY = badgeY - ((fitted.lines.length - 1) * lineHeight) / 2;
  fitted.lines.forEach((line, index) => context.fillText(line, x + 70, firstY + index * lineHeight));
  context.textBaseline = 'alphabetic';
}

function drawPin(context: Context, x: number, y: number) {
  context.fillStyle = '#071a6b';
  context.beginPath();
  context.arc(x, y, 18, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = COLORS.white;
  context.beginPath();
  context.arc(x, y - 3, 8, Math.PI, 0);
  context.lineTo(x, y + 10);
  context.closePath();
  context.fill();
  context.fillStyle = '#071a6b';
  context.beginPath();
  context.arc(x, y - 3, 3.2, 0, Math.PI * 2);
  context.fill();
}

function drawInfoBar(context: Context, details: CardDetails, qr: HTMLImageElement | null) {
  const y = 1128;
  const height = 132;
  const left = 70;
  const qrWidth = height;
  const locationWidth = 268;
  const linkWidth = 316;
  const ctaWidth = WIDTH - 70 - (left + locationWidth + qrWidth + linkWidth);

  // Location.
  const locationGradient = context.createLinearGradient(left, y, left + locationWidth, y);
  locationGradient.addColorStop(0, COLORS.royal);
  locationGradient.addColorStop(1, COLORS.bright);
  context.fillStyle = locationGradient;
  context.fillRect(left, y, locationWidth, height);
  drawPin(context, left + 30, y + height / 2);
  const locationText = details.location || 'Venue to be announced';
  const location = fitLines(context, locationText, 700, 24, 16, locationWidth - 66, 4);
  const lineHeight = location.size * 1.18;
  const firstLine = y + height / 2 - ((location.lines.length - 1) * lineHeight) / 2 + location.size * 0.35;
  location.lines.forEach((line, index) => {
    context.fillStyle = index === 0 ? COLORS.yellow : COLORS.white;
    context.fillText(line, left + 56, firstLine + index * lineHeight);
  });

  // QR code.
  const qrX = left + locationWidth;
  context.fillStyle = COLORS.white;
  context.fillRect(qrX, y, qrWidth, height);
  if (qr) context.drawImage(qr, qrX + 8, y + 8, qrWidth - 16, height - 16);

  // Link.
  const linkX = qrX + qrWidth;
  context.fillStyle = '#081c8f';
  context.fillRect(linkX, y, linkWidth, height);
  context.fillStyle = COLORS.soft;
  context.font = font(500, 14);
  context.fillText('SCAN TO REGISTER, OR VISIT', linkX + 20, y + 32);
  let host = details.eventUrl;
  let path = '';
  try {
    const url = new URL(details.eventUrl);
    host = url.host.replace(/^www\./, '');
    path = url.pathname;
  } catch {
    // Relative URL: show it as is.
  }
  context.fillStyle = COLORS.white;
  context.font = font(700, 24);
  context.fillText(host, linkX + 20, y + 66, linkWidth - 36);
  context.font = font(600, 22);
  context.fillText(path, linkX + 20, y + 96, linkWidth - 36);
  context.fillStyle = COLORS.yellow;
  context.font = font(600, 18);
  context.fillText(details.dateLabel !== 'Date TBA' ? details.dateLabel : 'Free registration', linkX + 20, y + 120, linkWidth - 36);

  // Call to action with stripes.
  const ctaX = linkX + linkWidth;
  const stripeWidth = 52;
  const ctaGradient = context.createLinearGradient(ctaX, y, ctaX + ctaWidth, y);
  ctaGradient.addColorStop(0, COLORS.bright);
  ctaGradient.addColorStop(1, COLORS.royal);
  context.fillStyle = ctaGradient;
  context.fillRect(ctaX, y, ctaWidth - stripeWidth, height);
  drawStripes(context, ctaX + ctaWidth - stripeWidth, y - 14, stripeWidth, height + 28, '#0b2fb0');
  context.textAlign = 'center';
  const ctaCentre = ctaX + (ctaWidth - stripeWidth) / 2;
  context.fillStyle = COLORS.yellow;
  context.font = font(700, 32);
  context.fillText('Join Me', ctaCentre, y + 60, ctaWidth - stripeWidth - 12);
  context.fillStyle = COLORS.white;
  context.font = font(700, 23);
  context.fillText('Register Free', ctaCentre, y + 96, ctaWidth - stripeWidth - 12);
  context.textAlign = 'left';
}

export async function renderAttendingCard(details: CardDetails): Promise<Blob> {
  await Promise.all(['500 40px Barlow', '600 40px Barlow', '700 40px Barlow'].map((face) => document.fonts?.load(face).catch(() => undefined)));
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser cannot create the card image.');

  const qrUrl = await QRCodeGenerator.toDataURL(details.eventUrl, {
    errorCorrectionLevel: 'M',
    margin: 0,
    width: 240,
    color: { dark: '#000000', light: '#ffffff' },
  }).catch(() => null);
  const [photo, logo, qr] = await Promise.all([
    details.photoUrl ? loadImage(details.photoUrl) : Promise.resolve(null),
    loadImage('/images/miv-logo.png'),
    qrUrl ? loadImage(qrUrl) : Promise.resolve(null),
  ]);

  drawBackground(context);

  // Logo badge (top left).
  const badge = { x: 140, y: 96, width: 214, height: 66 };
  context.save();
  context.shadowColor = 'rgba(40,120,255,.6)';
  context.shadowBlur = 24;
  context.fillStyle = COLORS.royal;
  context.beginPath();
  context.roundRect(badge.x, badge.y, badge.width, badge.height, 6);
  context.fill();
  context.restore();
  context.strokeStyle = 'rgba(150,190,255,.8)';
  context.lineWidth = 2;
  context.strokeRect(badge.x + 1, badge.y + 1, badge.width - 2, badge.height - 2);
  if (logo) {
    context.fillStyle = COLORS.white;
    context.beginPath();
    context.arc(badge.x + 36, badge.y + badge.height / 2, 24, 0, Math.PI * 2);
    context.fill();
    context.drawImage(logo, badge.x + 16, badge.y + badge.height / 2 - 20, 40, 40);
  }
  context.fillStyle = COLORS.white;
  context.font = font(700, 30);
  context.fillText('MIV', badge.x + 72, badge.y + 34);
  context.font = font(500, 13);
  context.fillText('MEN OF ISSACHAR VISION', badge.x + 72, badge.y + 54, badge.width - 82);

  // Event tag (top right).
  const tagX = 700;
  context.fillStyle = COLORS.yellow;
  context.fillRect(tagX, 104, 78, 24);
  context.fillStyle = COLORS.ink;
  context.font = font(700, 15);
  context.fillText('EVENT:', tagX + 9, 122);
  const eventLines = fitLines(context, details.eventTitle, 600, 28, 20, WIDTH - 60 - tagX, 3);
  context.fillStyle = COLORS.white;
  context.font = font(600, eventLines.size);
  eventLines.lines.forEach((line, index) => context.fillText(line, index === 0 ? tagX + 88 : tagX, 125 + index * (eventLines.size + 2), index === 0 ? WIDTH - 60 - tagX - 88 : WIDTH - 60 - tagX));

  // Headline.
  context.textAlign = 'center';
  context.shadowColor = 'rgba(0,0,0,.25)';
  context.shadowBlur = 12;
  context.font = font(700, 92);
  context.fillStyle = COLORS.white;
  context.fillText('I Will Be', WIDTH / 2, 330);
  context.fillStyle = COLORS.yellow;
  context.fillText('Attending', WIDTH / 2, 420);
  context.shadowBlur = 0;
  context.shadowColor = 'transparent';
  context.textAlign = 'left';

  // Photo frame, date pill and name tag.
  const frame = { x: 270, y: 470, width: 580, height: 600 };
  drawPhotoFrame(context, photo, frame.x, frame.y, frame.width, frame.height, 54);
  drawDatePill(context, dateParts(details.startsAt, details.dateLabel), details.dateLabel, 95, 628);
  drawNameTag(context, details.name, frame.x + frame.width, frame.y + frame.height - 50);

  drawInfoBar(context, details, qr);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create the card image.'))), 'image/png'));
}
