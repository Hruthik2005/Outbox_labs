import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { emailApi } from '../services/email-api';
import { DashboardMetrics, EmailDto } from '@reachinbox/shared';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  Calendar,
  Send,
  AlertCircle,
  Clock,
  Layers,
  Slack,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Activity
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentScheduled, setRecentScheduled] = useState<EmailDto[]>([]);
  const [recentSent, setRecentSent] = useState<EmailDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    try {
      const [m, scheduledRes, sentRes] = await Promise.all([
        emailApi.getMetrics().catch(() => ({
          totalScheduled: 0,
          totalSent: 0,
          totalFailed: 0,
          totalProcessing: 0,
          activeSendersCount: 0,
          slackConnected: false
        })),
        emailApi.getScheduled({ page: 1, limit: 5 }).catch(() => ({ items: [] })),
        emailApi.getSent({ page: 1, limit: 5 }).catch(() => ({ items: [] }))
      ]);
      setMetrics(m);
      setRecentScheduled(scheduledRes.items);
      setRecentSent(sentRes.items);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return <LoadingSpinner size="lg" className="py-24" />;
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950">Workspace Overview</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Monitor real-time BullMQ queuing, rate limits, and SMTP delivery.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            isLoading={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Link to="/compose">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Compose Email
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          {
            label: 'Scheduled',
            value: metrics?.totalScheduled ?? 0,
            icon: Calendar,
            color: 'text-zinc-900',
            bg: 'bg-zinc-50'
          },
          {
            label: 'Sent (Delivered)',
            value: metrics?.totalSent ?? 0,
            icon: Send,
            color: 'text-emerald-700',
            bg: 'bg-emerald-50/60'
          },
          {
            label: 'Processing',
            value: metrics?.totalProcessing ?? 0,
            icon: Clock,
            color: 'text-amber-700',
            bg: 'bg-amber-50/60'
          },
          {
            label: 'Failed / Rejected',
            value: metrics?.totalFailed ?? 0,
            icon: AlertCircle,
            color: 'text-rose-700',
            bg: 'bg-rose-50/60'
          },
          {
            label: 'Active Senders',
            value: metrics?.activeSendersCount ?? 0,
            icon: Layers,
            color: 'text-zinc-800',
            bg: 'bg-zinc-50'
          },
          {
            label: 'Slack Alerts',
            value: metrics?.slackConnected ? 'Connected' : 'Offline',
            icon: Slack,
            color: metrics?.slackConnected ? 'text-emerald-700' : 'text-zinc-400',
            bg: metrics?.slackConnected ? 'bg-emerald-50/50' : 'bg-zinc-50'
          }
        ].map((item, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm space-y-2 text-left"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">{item.label}</span>
              <div className={`p-1.5 rounded-lg ${item.bg}`}>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
            </div>
            <div className={`text-2xl font-bold tracking-tight ${item.color}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Bull Board Status Card Banner */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-950">Live BullMQ Queue Monitor</h3>
            <p className="text-xs text-zinc-500">
              Inspect active delayed jobs, Redis memory buffers, worker concurrency, and stalled job recovery.
            </p>
          </div>
        </div>
        <a
          href="http://localhost:8383/admin/queues"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-900 transition-colors"
        >
          Open Bull Board Dashboard
          <ExternalLink className="h-3.5 w-3.5 text-zinc-500" />
        </a>
      </div>

      {/* Two-Column Section: Scheduled and Sent Previews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Next Scheduled Batch */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div>
              <h2 className="text-base font-semibold text-zinc-950">Scheduled Queue</h2>
              <p className="text-xs text-zinc-500">Upcoming emails waiting for delayed execution</p>
            </div>
            <Link
              to="/scheduled"
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-950"
            >
              View all
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentScheduled.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              No emails currently in the scheduled queue.
            </div>
          ) : (
            <div className="space-y-3">
              {recentScheduled.map((email) => (
                <div
                  key={email.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/50 p-3.5 text-xs hover:border-zinc-200 transition-colors"
                >
                  <div className="space-y-0.5 text-left">
                    <p className="font-semibold text-zinc-900">{email.recipient}</p>
                    <p className="text-zinc-500 truncate max-w-xs">{email.subject}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <StatusBadge status={email.status} />
                    <p className="text-[11px] text-zinc-400">
                      {new Date(email.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Sent / Outcomes */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div>
              <h2 className="text-base font-semibold text-zinc-950">Recent Deliveries</h2>
              <p className="text-xs text-zinc-500">Sent records with Ethereal SMTP confirmations</p>
            </div>
            <Link
              to="/sent"
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-950"
            >
              View all
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentSent.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              No recent delivery events recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recentSent.map((email) => (
                <div
                  key={email.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/50 p-3.5 text-xs hover:border-zinc-200 transition-colors"
                >
                  <div className="space-y-0.5 text-left">
                    <p className="font-semibold text-zinc-900">{email.recipient}</p>
                    <p className="text-zinc-500 truncate max-w-xs">{email.subject}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <StatusBadge status={email.status} />
                    {email.etherealPreviewUrl && (
                      <div>
                        <a
                          href={email.etherealPreviewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-zinc-900 font-medium underline hover:text-zinc-600"
                        >
                          View Email
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
