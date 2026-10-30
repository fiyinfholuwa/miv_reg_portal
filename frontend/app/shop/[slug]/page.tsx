import ProductDetailsPage from '../../../components/ProductDetailsPage';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProductDetailsPage slug={slug} />;
}
