import { useEffect, useState, FormEvent } from 'react';
import { settingsService, HotelSettingsPayload } from '../services/misc.service';
import { Card, ErrorState, Input, LoadingState, PageHeader, PrimaryButton } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../services/api';

export function SettingsPage() {
  const { show } = useToast();
  const [form, setForm] = useState<HotelSettingsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsService
      .get()
      .then((res) => setForm(res.data))
      .catch((err) => setError(apiErrorMessage(err)));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      await settingsService.update(form);
      show('Settings updated.', 'success');
    } catch (err) {
      show(apiErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  if (error) return <ErrorState message={error} />;
  if (!form) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Hotel Settings" subtitle="Configure tax rate, cancellation policy, and check-in/out times" />
      <Card className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Hotel name" value={form.hotelName} onChange={(e) => setForm({ ...form, hotelName: e.target.value })} />
          <Input
            label="Tax percentage (%)"
            type="number"
            step="0.01"
            value={form.taxPercent}
            onChange={(e) => setForm({ ...form, taxPercent: parseFloat(e.target.value) })}
          />
          <Input
            label="Cancellation fee (%)"
            type="number"
            step="0.01"
            value={form.cancellationFeePercent}
            onChange={(e) => setForm({ ...form, cancellationFeePercent: parseFloat(e.target.value) })}
          />
          <Input
            label="Free cancellation window (hours before check-in)"
            type="number"
            value={form.freeCancellationHours}
            onChange={(e) => setForm({ ...form, freeCancellationHours: parseInt(e.target.value, 10) })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Check-in time" value={form.checkInTime} onChange={(e) => setForm({ ...form, checkInTime: e.target.value })} />
            <Input label="Check-out time" value={form.checkOutTime} onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })} />
          </div>
          <PrimaryButton type="submit" disabled={saving}>Save Settings</PrimaryButton>
        </form>
      </Card>
    </div>
  );
}
