import QRCode from './shop/QRCode';

export default function ShopQRCode({ value, large = false }: { value: string; large?: boolean }) {
  return <div className={['mx-auto bg-white', large ? 'max-w-xl p-4' : 'max-w-sm p-2'].join(' ')}><QRCode value={value} size={large ? 300 : 180} /></div>;
}
