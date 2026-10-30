export default function ShopBarcode({ value, large = false }: { value: string; large?: boolean }) {
  const bars = Array.from(value).flatMap((character, index) => {
    const code = character.charCodeAt(0) + index;
    return [1 + (code % 3), 1 + ((code >> 2) % 3), 1 + ((code >> 4) % 2)];
  });

  return <div className={`mx-auto flex items-stretch justify-center gap-[2px] bg-white ${large ? 'h-36 max-w-xl p-6' : 'h-20 max-w-sm p-3'}`} aria-label={`Barcode ${value}`}>
    {bars.map((width, index) => <span key={`${index}-${width}`} className={index % 2 === 0 ? 'bg-[#071d36]' : 'bg-transparent'} style={{ width: `${width * (large ? 2 : 1)}px` }} />)}
  </div>;
}
