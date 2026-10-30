import OrderPaidPage from '../../../../components/OrderPaidPage';

export default async function Page({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return <OrderPaidPage reference={reference} />;
}
