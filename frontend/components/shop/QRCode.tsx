'use client';

import QRCodeGenerator from 'qrcode';
import { useEffect, useState } from 'react';

/** Generates a crisp, scannable QR code for tickets and store pickup codes. */
export default function QRCode({ value, size = 180, className = '' }: { value: string; size?: number; className?: string }) {
  const [source, setSource] = useState('');

  useEffect(() => {
    let active = true;
    setSource('');
    void QRCodeGenerator.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: size,
      color: { dark: '#000000', light: '#ffffff' },
    }).then((dataUrl) => {
      if (active) setSource(dataUrl);
    }).catch(() => {
      if (active) setSource('');
    });

    return () => { active = false; };
  }, [value, size]);

  return (
    <div className={['mx-auto grid place-items-center overflow-hidden bg-white', className].join(' ')} style={{ width: size, height: size }}>
      {source ? <img src={source} alt={'QR code for ' + value} className="block h-full w-full" /> : <span className="px-3 text-center font-mono text-xs text-ink/50">{value}</span>}
    </div>
  );
}
