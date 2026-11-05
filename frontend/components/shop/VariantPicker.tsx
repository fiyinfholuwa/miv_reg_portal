'use client';

import type { ProductColor } from '../../lib/shop';

/** Light colours (white, cream) need an outline to show against white cards. */
function isLight(hex: string) {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  if (Number.isNaN(value)) return false;
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 200;
}

export function Swatch({ hex, size = 14, className = '' }: { hex: string; size?: number; className?: string }) {
  return <span aria-hidden="true" className={`inline-block shrink-0 rounded-full ${isLight(hex) ? 'ring-1 ring-inset ring-[#c9ced6]' : ''} ${className}`} style={{ background: hex, width: size, height: size }} />;
}

/** Large selectable colour swatches for the product page. */
export function ColorPicker({ colors, value, onChange }: { colors: ProductColor[]; value: string; onChange: (color: string) => void }) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-3 p-0 text-sm font-semibold text-[#22262e]">Colour: <span className="font-bold text-[#0c0d10]">{value || 'Choose a colour'}</span></legend>
      <div className="flex flex-wrap gap-3">
        {colors.map((color) => {
          const selected = color.name === value;
          return (
            <button
              key={color.name}
              type="button"
              onClick={() => onChange(color.name)}
              aria-pressed={selected}
              aria-label={color.name}
              title={color.name}
              className={`grid h-11 w-11 place-items-center rounded-full transition ${selected ? 'ring-2 ring-[#0c0d10] ring-offset-2' : 'ring-1 ring-[#e4e7ec] hover:ring-[#6b7280]'}`}
            >
              <Swatch hex={color.hex} size={34} />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Size buttons; `invalid` highlights the group when someone tries to add without a size. */
export function SizePicker({ sizes, value, onChange, invalid }: { sizes: string[]; value: string; onChange: (size: string) => void; invalid?: boolean }) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-3 flex w-full items-center justify-between p-0 text-sm font-semibold text-[#22262e]">
        <span>Size: <span className={`font-bold ${invalid && !value ? 'text-[#a82e26]' : 'text-[#0c0d10]'}`}>{value || 'Choose a size'}</span></span>
      </legend>
      <div className={`flex flex-wrap gap-2 rounded-2xl ${invalid && !value ? 'miv-shake' : ''}`}>
        {sizes.map((size) => {
          const selected = size === value;
          return (
            <button
              key={size}
              type="button"
              onClick={() => onChange(size)}
              aria-pressed={selected}
              className={`h-11 min-w-[52px] rounded-xl border-[1.5px] px-3 text-sm font-bold transition ${selected ? 'border-[#00203f] bg-[#00203f] text-white' : invalid && !value ? 'border-[#e2a49d] bg-[#fff6f5] text-[#0c0d10] hover:border-[#a82e26]' : 'border-[#c9ced6] bg-white text-[#0c0d10] hover:border-[#0c0d10]'}`}
            >
              {size}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Small clickable swatch row for product cards. */
export function SwatchRow({ colors, value, onChange }: { colors: ProductColor[]; value: string; onChange: (color: string) => void }) {
  if (colors.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Colours">
      {colors.map((color) => (
        <button
          key={color.name}
          type="button"
          onClick={(event) => { event.preventDefault(); onChange(color.name); }}
          aria-pressed={color.name === value}
          aria-label={color.name}
          title={color.name}
          className={`grid h-6 w-6 place-items-center rounded-full transition ${color.name === value ? 'ring-[1.5px] ring-[#0c0d10] ring-offset-1' : 'hover:ring-1 hover:ring-[#6b7280]'}`}
        >
          <Swatch hex={color.hex} size={16} />
        </button>
      ))}
      <span className="ml-1 text-xs font-semibold text-[#6b7280]">{colors.length > 1 ? `${colors.length} colours` : value}</span>
    </div>
  );
}
