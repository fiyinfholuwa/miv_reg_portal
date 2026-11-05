import { code128Widths } from '../../lib/code128';

const QUIET_ZONE = 10;

/**
 * Scannable Code 128 barcode as crisp SVG. Bars scale with the width of the
 * container; keep it on a white background with the built-in quiet zone.
 */
export default function Code128Barcode({ value, height = 80, className = '' }: { value: string; height?: number; className?: string }) {
  let widths: number[];
  try {
    widths = code128Widths(value);
  } catch {
    return <p className="text-center text-sm font-bold">{value}</p>;
  }

  const total = widths.reduce((sum, width) => sum + width, 0) + QUIET_ZONE * 2;
  let x = QUIET_ZONE;
  const bars = widths.flatMap((width, index) => {
    const bar = index % 2 === 0 ? [<rect key={index} x={x} y={0} width={width} height={height} />] : [];
    x += width;
    return bar;
  });

  return (
    <svg viewBox={`0 0 ${total} ${height}`} preserveAspectRatio="none" shapeRendering="crispEdges" role="img" aria-label={`Barcode ${value}`} className={`block w-full bg-white ${className}`} style={{ height }}>
      <rect width={total} height={height} fill="#ffffff" />
      <g fill="#000000">{bars}</g>
    </svg>
  );
}
