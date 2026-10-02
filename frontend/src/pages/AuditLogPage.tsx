import { useEffect, useState, useCallback } from 'react';
import { auditLogService } from '../services/audit-log.service';
import { AuditLog } from '../types';
import { Card, ErrorState, Input, LoadingState, PageHeader, SecondaryButton, Select } from '../components/ui';
import { apiErrorMessage } from '../services/api';
import { ShieldAlert, History } from 'lucide-react';

const ACTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'CREATE_RESERVATION', label: 'Create Reservation' },
  { value: 'UPDATE_RESERVATION', label: 'Update Reservation' },
  { value: 'CANCEL_RESERVATION', label: 'Cancel Reservation' },
  { value: 'CHECK_IN', label: 'Check In' },
  { value: 'CHECK_OUT', label: 'Check Out' },
  { value: 'RECORD_PAYMENT', label: 'Record Payment' },
];

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [action, setAction] = useState('');
  const [userName, setUserName] = useState('');
  const [entity, setEntity] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadLogs = useCallback(
    async (targetPage = 1) => {
      setLoading(true);
      setError(null);
      try {
        const res = await auditLogService.list({
          action: action || undefined,
          userName: userName || undefined,
          entity: entity || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          page: targetPage,
          limit: 20,
        });
        setLogs(res.data);
        setTotal(res.total);
        setPage(res.page);
        setTotalPages(res.totalPages);
      } catch (err) {
        setError(apiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [action, entity, fromDate, toDate, userName],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- safe: async fetch on mount, no infinite loop
    loadLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: fetch once on mount; filters applied on form submit, not on every keystroke
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadLogs(1);
  }

  function handleClear() {
    setAction('');
    setUserName('');
    setEntity('');
    setFromDate('');
    setToDate('');
    loadLogs(1);
  }

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="System-wide security and operational activity inspection log" />

      <Card className="mb-6">
        <form onSubmit={handleSearch} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
          <Select label="Action Filter" value={action} onChange={(e) => setAction(e.target.value)}>
            {ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Select>
          <Input
            label="User Name"
            placeholder="Search staff/user..."
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <Input label="From Date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Input label="To Date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <div className="flex items-center gap-2">
            <SecondaryButton type="submit" className="w-full">
              Filter Logs
            </SecondaryButton>

            <SecondaryButton type="button" onClick={handleClear} className="w-full">
              Reset
            </SecondaryButton>
          </div>
        </form>
      </Card>

      {loading && <LoadingState label="Loading system audit logs..." />}
      {error && <ErrorState message={error} />}

      {!loading && !error && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-brand-600" />
              <h3 className="text-base font-semibold text-slate-900">Recorded Operations ({total})</h3>
            </div>
            <div className="text-xs text-slate-500">
              Page {page} of {totalPages || 1}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Timestamp</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Entity</th>
                  <th className="px-4 py-3 text-left">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500 text-xs">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">
                      {log.userName || 'System'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 font-mono">
                      {log.entity}#{log.entityId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-xs max-w-md truncate">{log.description}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      No audit log records match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-4 text-sm">
              <SecondaryButton disabled={page <= 1} onClick={() => loadLogs(page - 1)}>
                Previous
              </SecondaryButton>
              <span className="text-xs text-slate-500">
                Page {page} of {totalPages}
              </span>
              <SecondaryButton disabled={page >= totalPages} onClick={() => loadLogs(page + 1)}>
                Next
              </SecondaryButton>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
