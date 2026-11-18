import type { Metadata } from 'next';
import { fetchSharedCard, siteOrigin } from '../../../../../lib/server-api';
import ContinueToEvent from './ContinueToEvent';

type Params = { params: Promise<{ slug: string; code: string }> };

/**
 * Public share page for an "I will be attending" card. Link previews
 * (WhatsApp, Facebook, LinkedIn, X…) read the og:image, which is the card;
 * people who open the link are sent on to the event page to register.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, code } = await params;
  const [card, origin] = await Promise.all([fetchSharedCard(slug, code), siteOrigin()]);
  const pageUrl = `${origin}/events/${slug}/attending/${code}`;
  if (!card) return { title: 'Join me at MIV', openGraph: { url: pageUrl } };

  // The version keeps previews fresh when someone updates their card.
  const version = new URL(card.image_url).searchParams.get('v') ?? '';
  const image = { url: `${origin}/events/${slug}/attending/${code}/image${version ? `?v=${version}` : ''}`, width: 1080, height: 1350, type: 'image/png', alt: card.title };

  return {
    title: card.title,
    description: card.description,
    openGraph: { type: 'website', siteName: 'The Men of Issachar Vision', title: card.title, description: card.description, url: pageUrl, images: [image] },
    twitter: { card: 'summary_large_image', title: card.title, description: card.description, images: [image.url] },
  };
}

export default async function SharedCardPage({ params }: Params) {
  const { slug, code } = await params;
  const card = await fetchSharedCard(slug, code);
  const eventHref = `/events/${slug}`;

  return (
    <main className="grid min-h-dvh place-items-center bg-[#06124a] px-4 py-10 text-center text-white">
      <div className="w-full max-w-sm">
        {card && <img src={`/events/${slug}/attending/${code}/image`} alt={card.title} className="mx-auto w-full rounded-2xl shadow-2xl" />}
        <h1 className="mt-6 text-xl font-bold">{card ? card.title : 'Join me at MIV'}</h1>
        <a href={eventHref} className="mt-5 inline-flex rounded-full bg-[#f2e22c] px-6 py-3 text-sm font-bold text-[#07124d]">Register free →</a>
        <ContinueToEvent href={eventHref} />
      </div>
    </main>
  );
}
