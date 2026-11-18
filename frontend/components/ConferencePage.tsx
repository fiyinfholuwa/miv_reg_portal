'use client';

import { useEffect, useState } from 'react';
import HeroSection from './conference/HeroSection';
import {
  AboutSection,
  ExperienceSection,
  HostsSection,
  MinistersSection,
  StatsSection,
} from './conference/OverviewSections';
import ScheduleSection from './conference/ScheduleSection';
import {
  FAQSection,
  GallerySection,
  MediaSection,
  MerchSection,
  TestimonialsSection,
  VenueSection,
} from './conference/MoreSections';
import {
  FooterSection,
  PartnershipSection,
  RegistrationSection,
} from './conference/RegistrationSections';
import RegistrationModal from './conference/RegistrationModal';

export default function ConferencePage() {
  const [showDetails, setShowDetails] = useState<boolean | null>(null);

  useEffect(() => {
    const update = () => setShowDetails(window.location.hash !== '#register');
    update();
    window.addEventListener('hashchange', update);
    window.addEventListener('popstate', update);
    return () => {
      window.removeEventListener('hashchange', update);
      window.removeEventListener('popstate', update);
    };
  }, []);

  return (
    <main className="overflow-hidden">
      <RegistrationModal defaultEvent="imlc" />
      {showDetails && <>
        <HeroSection />
        <StatsSection />
        <AboutSection />
        <ExperienceSection />
        <HostsSection />
        <MinistersSection />
        <ScheduleSection />
        <MediaSection />
        <TestimonialsSection />
        <VenueSection />
        <MerchSection />
        <GallerySection />
        <FAQSection />
        <RegistrationSection />
        <PartnershipSection />
        <FooterSection />
      </>}
    </main>
  );
}
