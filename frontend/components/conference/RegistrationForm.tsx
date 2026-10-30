'use client';

import { Arrow } from './ConferenceAtoms';

export default function RegistrationForm() {
  return <div><p className="type-body-muted text-sky/75">Start with your email. We’ll check whether you’re new or already registered, then guide you through the right next step.</p><div className="mt-6 grid gap-3 text-sm font-semibold text-sky/80"><p>✓ Free delegate registration</p><p>✓ Attend onsite or online</p><p>✓ Update your details later</p></div><button className="button-light mt-7 w-full" type="button" onClick={() => window.dispatchEvent(new Event('open-registration-modal'))}>Start with email <Arrow /></button></div>;
}
