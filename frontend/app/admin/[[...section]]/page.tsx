import AdminDashboard from '../../../components/admin/AdminDashboard';

/** Every admin page (/admin, /admin/registrants, /admin/store-orders, …) renders the same dashboard shell. */
export default function AdminPage() {
  return <AdminDashboard />;
}
