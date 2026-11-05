'use client';

import RegistrationModal from '../conference/RegistrationModal';
import { HubFooter } from './HubChrome';
import HubGallery from './HubGallery';
import HubHero from './HubHero';
import { AboutSection, EventsSection, HostsSection, PartnerSection, ShopSection, StatsSection } from './HubSections';
import { nextEvent, nextEventSlug, useHubEvents } from './hub-data';
import { useSiteContent } from '../../lib/site-content';

export default function HubLanding() {
  const events = useHubEvents();
  const content = useSiteContent();
  const registerSlug = nextEventSlug(events);
  return (
    <main className="miv-hub">
      <RegistrationModal />
      <HubHero registerSlug={registerSlug} next={nextEvent(events)} content={content.hero} />
      <AboutSection content={content.about} />
      <StatsSection content={content.stats} />
      <EventsSection events={events} content={content.events} />
      <HostsSection content={content.hosts} />
      <HubGallery events={events} content={content.gallery} />
      <ShopSection content={content.shop} />
      <PartnerSection content={content.partner} />
      <HubFooter />
    </main>
  );
}
