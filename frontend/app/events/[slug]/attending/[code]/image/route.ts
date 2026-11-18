import { fetchSharedCard } from '../../../../../../lib/server-api';

/** The card image, served from this site's domain so shares never expose the API server. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; code: string }> }) {
  const { slug, code } = await params;
  const card = await fetchSharedCard(slug, code);
  if (!card) return new Response('Not found', { status: 404 });

  const image = await fetch(card.image_url, { next: { revalidate: 300 } }).catch(() => null);
  if (!image?.ok) return new Response('Not found', { status: 404 });

  return new Response(image.body, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
