import { useAuth } from '../hooks/useAuth.js';

export default function Profile() {
  const { user } = useAuth();

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg border border-slate-200">
      <h1 className="text-2xl font-bold mb-4">Mi perfil</h1>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between"><dt className="text-slate-500">Nombre</dt><dd>{user?.name}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd>{user?.email}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Teléfono</dt><dd>{user?.phone || '—'}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Rol</dt><dd className="capitalize">{user?.role}</dd></div>
      </dl>
    </div>
  );
}
