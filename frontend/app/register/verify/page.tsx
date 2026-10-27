import { Suspense } from 'react';
import RegistrationLinkPage from '../../../components/conference/RegistrationLinkPage';

export default function Page() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#e8edf3] text-[#071d36]">Verifying your email…</main>}><RegistrationLinkPage /></Suspense>;
}
