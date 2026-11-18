'use client';

/** Areas an admin can be limited to. `null` permissions mean full access. */
export type AdminPermission = 'people' | 'events' | 'media' | 'check_in' | 'meals' | 'accommodation' | 'merch' | 'finance';
export type AdminPermissions = AdminPermission[] | null;

export const PERMISSIONS: { key: AdminPermission; label: string; description: string }[] = [
  { key: 'people', label: 'People', description: 'Registrants and teams' },
  { key: 'events', label: 'Events', description: 'Events and event content' },
  { key: 'media', label: 'Media', description: 'Broadcasts, testimonies, landing page, partner enquiries' },
  { key: 'check_in', label: 'Check-in', description: 'Welcome desk' },
  { key: 'meals', label: 'Meals', description: 'Meal points' },
  { key: 'accommodation', label: 'Accommodation', description: 'People who need a room' },
  { key: 'merch', label: 'Merch', description: 'Shop products and store handover' },
  { key: 'finance', label: 'Finance', description: 'Store orders, revenue and Paystack keys' },
];

export const hasPermission = (permissions: AdminPermissions, needed: AdminPermission | AdminPermission[]) =>
  permissions === null || (Array.isArray(needed) ? needed : [needed]).some((key) => permissions.includes(key));

export function permissionSummary(permissions: AdminPermissions) {
  if (permissions === null) return 'Full access';
  return PERMISSIONS.filter((item) => permissions.includes(item.key)).map((item) => item.label).join(', ') || 'No access';
}

/** "Full access" switch plus one checkbox per area. */
export function PermissionPicker({ value, onChange }: { value: AdminPermissions; onChange: (value: AdminPermissions) => void }) {
  const full = value === null;
  const toggle = (key: AdminPermission) => {
    const current = value ?? [];
    onChange(current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-semibold">Access</legend>
      <label className={`flex cursor-pointer items-start gap-3 rounded-xl p-3 text-sm ${full ? 'bg-[#03284a] text-white' : 'bg-white'}`}>
        <input type="checkbox" checked={full} onChange={() => onChange(full ? [] : null)} className="mt-0.5 h-4 w-4" />
        <span><strong className="block">Full access</strong><span className={`text-xs ${full ? 'text-white/70' : 'text-ink/55'}`}>Every page, including managing admins.</span></span>
      </label>
      {!full && (
        <div className="grid gap-2 sm:grid-cols-2">
          {PERMISSIONS.map((item) => (
            <label key={item.key} className={`flex cursor-pointer items-start gap-3 rounded-xl p-3 text-sm ring-1 ${value?.includes(item.key) ? 'bg-[#e7f1fa] ring-[#1469a9]/40' : 'bg-white ring-ink/10'}`}>
              <input type="checkbox" checked={value?.includes(item.key) ?? false} onChange={() => toggle(item.key)} className="mt-0.5 h-4 w-4" />
              <span className="min-w-0"><strong className="block">{item.label}</strong><span className="text-xs text-ink/55">{item.description}</span></span>
            </label>
          ))}
        </div>
      )}
      {!full && (value?.length ?? 0) === 0 && <p className="text-xs text-coral">Choose at least one area.</p>}
    </fieldset>
  );
}
