import { useEffect, useState, FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { usersService } from '../services/misc.service';
import { AuthUser } from '../types';
import { Card, ErrorState, Input, LoadingState, PageHeader, PrimaryButton, Select, SecondaryButton } from '../components/ui';
import { Modal } from '../components/Modal';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../services/api';

export function UsersPage() {
  const { show } = useToast();
  const [users, setUsers] = useState<(AuthUser & { isActive: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await usersService.list();
      setUsers(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(u: AuthUser & { isActive: boolean }) {
    try {
      await usersService.update(u.id, { isActive: !u.isActive });
      show(`${u.name} ${u.isActive ? 'deactivated' : 'activated'}.`, 'success');
      load();
    } catch (err) {
      show(apiErrorMessage(err), 'error');
    }
  }

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Manage staff accounts and roles"
        actions={<PrimaryButton onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Add User</PrimaryButton>}
      />

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {!loading && !error && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3">{u.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="px-4 py-3">
                    <SecondaryButton onClick={() => toggleActive(u)}>
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </SecondaryButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {showForm && <UserFormModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function UserFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { show } = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'RECEPTIONIST' as 'ADMIN' | 'RECEPTIONIST' | 'CUSTOMER', phone: '' });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await usersService.create(form);
      show('User created.', 'success');
      onSaved();
    } catch (err) {
      show(apiErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add User" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Password" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'ADMIN' | 'RECEPTIONIST' | 'CUSTOMER' })}>
          <option value="ADMIN">Admin</option>
          <option value="RECEPTIONIST">Receptionist</option>
        </Select>
        <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <div className="flex justify-end gap-3 pt-2">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={submitting}>Create User</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
