import type { Metadata } from 'next';
import { EventsIndexPage } from '../../components/landing/EventsPages';

export const metadata: Metadata = {
  title: 'Events | The Men of Issachar Vision',
  description: 'Every MIV conference, retreat and leadership gathering in one place.',
};

export default function Page() {
  return <EventsIndexPage />;
}
