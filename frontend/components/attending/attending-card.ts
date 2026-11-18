import QRCodeGenerator from 'qrcode';

/**
 * Draws the shareable "I will be attending" card (1080×1350, Instagram portrait)
 * on a canvas and returns it as a PNG. Pure browser code, no React.
 */
export type CardDetails = {
  name: string;
  eventTitle: string;
  dateLabel: string;
  location: string | null;
  eventUrl: string;
  photoUrl: string | null;
};

const WIDTH = 1080;
const HEIGHT = 1350;
const COLORS = { cream: '#faf6ec', navy: '#001428', cobalt: '#1460a1', brick: '#a82e26', yellow: '#f4d33d', mist: '#bcd6ec', ink: '#0c0d10' };

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

  const qrUrl = await QRCodeGenerator.toDataURL(details.eventUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 180,
    color: { dark: '#001428', light: '#ffffff' },
  }).catch(() => null);
  const [photo, logo, qr] = await Promise.all([
    details.photoUrl ? loadImage(details.photoUrl) : Promise.resolve(null),
    loadImage('/images/miv-logo.png'),
    qrUrl ? loadImage(qrUrl) : Promise.resolve(null),
  ]);

  // Clean branded frame inspired by the supplied blue/yellow publicity style.
  context.fillStyle = COLORS.cobalt;
  context.beginPath();
  context.arc(940, 150, 260, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#0c3c87';
  context.beginPath();
  context.arc(120, 720, 340, 0, Math.PI * 2);
  context.fill();

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
  context.font = font(700, 106);
  context.fillText('I WILL BE', 96, 650);
  context.fillStyle = COLORS.yellow;
  context.fillText('ATTENDING', 96, 755);

  // Event details on the clean cream panel.
  context.fillStyle = COLORS.cream;
  context.beginPath();
  context.roundRect(40, 800, WIDTH - 80, HEIGHT - 840, 48);
  context.fill();

  context.fillStyle = COLORS.yellow;
  context.fillRect(96, 852, 150, 12);
  context.fillStyle = COLORS.brick;
  context.font = font(700, 28);
  wrap(context, [details.dateLabel !== 'Date TBA' ? details.dateLabel : '', details.location ?? ''].filter(Boolean).join('  ·  ').toUpperCase() || 'THE MEN OF ISSACHAR VISION', 96, 920, 700, 34, 2);

  context.fillStyle = COLORS.ink;
  context.font = font(600, 52);
  const afterTitle = wrap(context, details.eventTitle, 96, 1000, 700, 58, 2);

  context.fillStyle = COLORS.brick;
  context.fillRect(96, afterTitle + 12, 120, 8);

  context.fillStyle = COLORS.ink;
  context.font = font(700, 46);
  wrap(context, details.name || 'YOUR NAME', 96, afterTitle + 96, 700, 52, 1);

  if (qr) {
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.roundRect(830, 870, 160, 160, 18);
    context.fill();
    context.drawImage(qr, 840, 880, 140, 140);
    context.fillStyle = COLORS.navy;
    context.font = font(700, 17);
    context.textAlign = 'center';
    context.fillText('SCAN TO JOIN', 910, 1055);
    context.textAlign = 'left';
  }

  context.fillStyle = '#6b7280';
  context.font = font(500, 24);
  context.fillText('THE MEN OF ISSACHAR VISION  ·  REGISTER FREE', 96, HEIGHT - 64);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create the card image.'))), 'image/png'));
}
