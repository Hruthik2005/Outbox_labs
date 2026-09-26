import React, { useState, useEffect } from 'react';
import { emailApi } from '../services/email-api';
import { EmailDto } from '@reachinbox/shared';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useToast } from '../hooks/useToast';
import { Calendar, Search, RefreshCw, XCircle, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ScheduledEmailsPage: React.FC = () => {
  const { showToast } = useToast();
  const [emails, setEmails] = useState<EmailDto[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const limit = 15;

  const loadScheduled = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      if (searchQuery.trim()) {
        const res = await emailApi.searchEmails(searchQuery.trim(), page, limit);
        // Filter scheduled statuses
        const filtered = res.items.filter((item) =>
          ['SCHEDULED', 'QUEUED', 'PROCESSING'].includes(item.status)
        );
        setEmails(filtered);
        setTotal(res.meta?.total || filtered.length);
      } else {
        const res = await emailApi.getScheduled({ page, limit });
        setEmails(res.items);
        setTotal(res.meta?.total || res.items.length);
      }
    } catch (err) {
      console.error('Failed to load scheduled emails', err);
      showToast('Error loading scheduled emails', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadScheduled();
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadScheduled();
  };

  const handleCancelEmail = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled email?')) return;
    setCancellingId(id);
    try {
      await emailApi.cancelEmail(id);
      showToast('Email cancelled and removed from queue', 'success');
      loadScheduled(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      showToast(error.response?.data?.error?.message || 'Could not cancel email', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Scheduled Emails</h1>
          <p className="text-xs text-zinc-500">
            Pending jobs delayed in BullMQ backed by Redis ({total} total queued)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadScheduled(true)}
            isLoading={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Link to="/compose">
            <Button size="sm" className="gap-2">
              <Send className="h-4 w-4" />
              Compose New
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search scheduled emails by recipient, subject, or sender..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {/* Table Container */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <LoadingSpinner className="py-20" />
        ) : emails.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Calendar}
              title="No scheduled emails found"
              description="You have no emails currently waiting in the delayed queue. Create a new campaign to schedule emails."
              actionLabel="Schedule Emails"
              onAction={() => window.location.assign('/compose')}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50/70 text-zinc-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Recipient</th>
                  <th className="px-5 py-3.5">Subject</th>
                  <th className="px-5 py-3.5">Sender</th>
                  <th className="px-5 py-3.5">Scheduled Delivery</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {emails.map((email) => (
                  <tr key={email.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-zinc-900">
                      {email.recipient}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600 max-w-xs truncate">
                      {email.subject}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500">
                      {email.sender?.name ? `${email.sender.name} (${email.sender.email})` : 'Sender'}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600 whitespace-nowrap">
                      {new Date(email.scheduledAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={email.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      {['SCHEDULED', 'QUEUED'].includes(email.status) && (
                        <button
                          onClick={() => handleCancelEmail(email.id)}
                          disabled={cancellingId === email.id}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                          title="Cancel email"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {emails.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3 bg-zinc-50/50 text-xs text-zinc-500">
            <div>
              Page <span className="font-semibold text-zinc-800">{page}</span> of{' '}
              <span className="font-semibold text-zinc-800">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
