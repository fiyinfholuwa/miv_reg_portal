import ConferencePage from '../../../components/ConferencePage';
import { EventDetailPage } from '../../../components/landing/EventsPages';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // IMLC keeps its full Jan Conf 2027 microsite.
  if (slug === 'imlc') return <ConferencePage />;
  return <EventDetailPage slug={slug} />;
}
