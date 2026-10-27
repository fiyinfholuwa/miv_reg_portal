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
  AccreditationSection,
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
  return (
    <main className="overflow-hidden">
      <RegistrationModal />
      <HeroSection />
      <StatsSection />
      <AboutSection />
      <ExperienceSection />
      <HostsSection />
      <MinistersSection />
      <ScheduleSection />
      <AccreditationSection />
      <MediaSection />
      <TestimonialsSection />
      <VenueSection />
      <MerchSection />
      <GallerySection />
      <FAQSection />
      <RegistrationSection />
      <PartnershipSection />
      <FooterSection />
    </main>
  );
}
