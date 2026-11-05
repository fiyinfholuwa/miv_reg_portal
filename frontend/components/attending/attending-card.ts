/**
 * Draws the shareable "I will be attending" card (1080×1350, Instagram portrait)
 * on a canvas and returns it as a PNG. Pure browser code, no React.
 */
export type CardDetails = {
  name: string;
  eventTitle: string;
  dateLabel: string;
  location: string | null;
  photoUrl: string | null;
};

const WIDTH = 1080;
const HEIGHT = 1350;
const COLORS = { cream: '#faf6ec', navy: '#001428', cobalt: '#1460a1', brick: '#a82e26', mist: '#bcd6ec', ink: '#0c0d10' };

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

/** Cover-crop an image into a rounded rectangle. */
function drawCover(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number, radius: number) {
  const scale = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  context.save();
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.clip();
  // Bias the crop slightly upward so faces stay in frame.
  context.drawImage(image, (image.width - sourceWidth) / 2, Math.max(0, (image.height - sourceHeight) * 0.3), sourceWidth, sourceHeight, x, y, width, height);
  context.restore();
}

/** Wrap text to a width; returns the y after the last line. */
function wrap(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines) shown[maxLines - 1] = `${shown[maxLines - 1].replace(/\s+\S*$/, '')}…`;
  shown.forEach((text, index) => context.fillText(text, x, y + index * lineHeight));
  return y + shown.length * lineHeight;
}

export async function renderAttendingCard(details: CardDetails): Promise<Blob> {
  await Promise.all(['600 40px Barlow', '700 40px Barlow', '500 40px Barlow'].map((font) => document.fonts?.load(font).catch(() => undefined)));
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser cannot create the card image.');
  const font = (weight: number, size: number) => `${weight} ${size}px Barlow, 'Helvetica Neue', Arial, sans-serif`;

  context.fillStyle = COLORS.cream;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  // Navy panel with the photo.
  context.fillStyle = COLORS.navy;
  context.beginPath();
  context.roundRect(40, 40, WIDTH - 80, 760, 48);
  context.fill();

  const [photo, logo] = await Promise.all([details.photoUrl ? loadImage(details.photoUrl) : Promise.resolve(null), loadImage('/images/miv-logo.png')]);
  if (photo) {
    drawCover(context, photo, 40, 40, WIDTH - 80, 760, 48);
    const shade = context.createLinearGradient(0, 380, 0, 800);
    shade.addColorStop(0, 'rgba(0,20,40,0)');
    shade.addColorStop(1, 'rgba(0,20,40,.85)');
    context.save();
    context.beginPath();
    context.roundRect(40, 40, WIDTH - 80, 760, 48);
    context.clip();
    context.fillStyle = shade;
    context.fillRect(40, 380, WIDTH - 80, 420);
    context.restore();
  } else {
    context.fillStyle = COLORS.mist;
    context.font = font(600, 34);
    context.textAlign = 'center';
    context.fillText('Add your photo', WIDTH / 2, 430);
    context.textAlign = 'left';
  }

  if (logo) {
    context.fillStyle = 'rgba(255,255,255,.92)';
    context.beginPath();
    context.arc(124, 124, 52, 0, Math.PI * 2);
    context.fill();
    context.drawImage(logo, 82, 82, 84, 84);
  }

  // Headline over the bottom of the photo.
  context.fillStyle = COLORS.cream;
  context.font = font(700, 112);
  context.fillText('I will be', 96, 660);
  context.fillText('attending', 96, 765);

  // Event details on cream.
  context.fillStyle = COLORS.brick;
  context.font = font(700, 30);
  context.fillText([details.dateLabel !== 'Date TBA' ? details.dateLabel : '', details.location ?? ''].filter(Boolean).join('  ·  ').toUpperCase() || 'THE MEN OF ISSACHAR VISION', 96, 880);

  context.fillStyle = COLORS.ink;
  context.font = font(600, 54);
  const afterTitle = wrap(context, details.eventTitle, 96, 950, WIDTH - 192, 62, 2);

  context.fillStyle = COLORS.cobalt;
  context.fillRect(96, afterTitle + 6, 120, 8);

  context.fillStyle = COLORS.ink;
  context.font = font(700, 48);
  wrap(context, details.name || 'Your name', 96, afterTitle + 92, WIDTH - 192, 56, 1);

  context.fillStyle = '#6b7280';
  context.font = font(500, 26);
  context.fillText('The Men of Issachar Vision · Register free', 96, HEIGHT - 60);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create the card image.'))), 'image/png'));
}
