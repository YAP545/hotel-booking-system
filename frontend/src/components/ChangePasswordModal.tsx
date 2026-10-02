import { useState, FormEvent } from 'react';
import { Modal } from './Modal';
import { Input, PrimaryButton, SecondaryButton } from './ui';
import { authService } from '../services/auth.service';
import { apiErrorMessage } from '../services/api';
import { useToast } from '../context/ToastContext';

interface ChangePasswordModalProps {
  onClose: () => void;
}

export function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation password do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.changePassword({ currentPassword, newPassword });
      toast.show(res.message || 'Password updated successfully.', 'success');
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Change Password" onClose={onClose} widthClass="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700">{error}</div>}

        <Input
          label="Current Password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />

        <Input
          label="New Password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />

        <Input
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <div className="flex justify-end gap-3 pt-2">
          <SecondaryButton type="button" onClick={onClose} disabled={loading}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
