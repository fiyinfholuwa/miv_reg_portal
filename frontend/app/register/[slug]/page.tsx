import RegisterForEventPage from '../../../components/conference/RegisterForEventPage';

/** Short, shareable registration link for one event: /register/<event-slug>. */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <RegisterForEventPage slug={slug} />;
}
