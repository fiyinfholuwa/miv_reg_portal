import Code128Barcode from './shop/Code128Barcode';

export default function ShopBarcode({ value, large = false }: { value: string; large?: boolean }) {
  return <div className={`mx-auto bg-white ${large ? 'max-w-xl p-4' : 'max-w-sm p-2'}`}><Code128Barcode value={value} height={large ? 140 : 80} /></div>;
}
