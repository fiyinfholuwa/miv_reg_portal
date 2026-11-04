'use client';

import RegistrationModal from '../conference/RegistrationModal';
import { HubFooter } from './HubChrome';
import HubGallery from './HubGallery';
import HubHero from './HubHero';
import { AboutSection, EventsSection, HostsSection, PartnerSection, ShopSection, StatsSection } from './HubSections';
import { nextEventSlug, useHubEvents } from './hub-data';

export default function HubLanding() {
  const events = useHubEvents();
  const registerSlug = nextEventSlug(events);
  return (
    <main className="miv-hub">
      <RegistrationModal />
      <HubHero registerSlug={registerSlug} />
      <AboutSection />
      <StatsSection />
      <EventsSection events={events} />
      <HostsSection />
      <HubGallery events={events} />
      <ShopSection />
      <PartnerSection />
      <HubFooter />
    </main>
  );
}
