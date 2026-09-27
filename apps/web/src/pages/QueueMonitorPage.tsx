import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api-client';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  Activity,
  ExternalLink,
  RefreshCw,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  Database,
  Cpu,
  ShieldCheck
} from 'lucide-react';

interface QueueMetrics {
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  isPaused: boolean;
  queueName: string;
  timestamp: string;
}

export const QueueMonitorPage: React.FC = () => {
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMetrics = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: QueueMetrics }>('/health/queue');
      if (res.data?.data) {
        setMetrics(res.data.data);
      }
    } catch {
      // In local dev fallback default metrics
      setMetrics((prev) => prev || {
        waiting: 0,
        active: 0,
        delayed: 0,
        completed: 0,
        failed: 0,
        isPaused: false,
        queueName: 'email-scheduler-queue',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(() => fetchMetrics(), 5000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <LoadingSpinner size="lg" className="py-24" />;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Queue Monitor
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Real-time BullMQ job states, Redis delayed timers, concurrency telemetry, and worker health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchMetrics(true)}
            isLoading={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>

          <a
            href="http://localhost:8383/admin/queues"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors shadow-xs"
          >
            <Activity className="h-3.5 w-3.5" />
            Launch Bull Board UI
            <ExternalLink className="h-3 w-3 text-zinc-400" />
          </a>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Delayed (Scheduled)</span>
            <div className="p-1.5 rounded-lg bg-zinc-100">
              <Clock className="h-4 w-4 text-zinc-800" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-950 tracking-tight">
            {metrics?.delayed ?? 0}
          </div>
          <p className="text-[11px] text-zinc-400">Waiting for target timestamp</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Waiting (Due)</span>
            <div className="p-1.5 rounded-lg bg-blue-50">
              <Layers className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-900 tracking-tight">
            {metrics?.waiting ?? 0}
          </div>
          <p className="text-[11px] text-zinc-400">Ready for worker processing</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Active (Processing)</span>
            <div className="p-1.5 rounded-lg bg-amber-50">
              <Activity className="h-4 w-4 text-amber-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-900 tracking-tight">
            {metrics?.active ?? 0}
          </div>
          <p className="text-[11px] text-zinc-400">Under worker execution lock</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Completed</span>
            <div className="p-1.5 rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-900 tracking-tight">
            {metrics?.completed ?? 0}
          </div>
          <p className="text-[11px] text-zinc-400">SMTP delivery confirmed</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Failed / Rescheduled</span>
            <div className="p-1.5 rounded-lg bg-rose-50">
              <AlertCircle className="h-4 w-4 text-rose-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-900 tracking-tight">
            {metrics?.failed ?? 0}
          </div>
          <p className="text-[11px] text-zinc-400">Rate limited or rejected</p>
        </div>
      </div>

      {/* Architectural Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-100 text-zinc-900">
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">Worker Concurrency</h3>
              <p className="text-[11px] text-zinc-500">BullMQ Worker Process</p>
            </div>
          </div>
          <div className="text-xs text-zinc-600 space-y-1 leading-relaxed">
            <div className="flex justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500">Configured Concurrency:</span>
              <span className="font-semibold text-zinc-900">5 parallel workers</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500">Send Pacing:</span>
              <span className="font-semibold text-zinc-900">Distributed atomic delay</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-500">Scheduler Type:</span>
              <span className="font-semibold text-emerald-700">Zero-Cron (BullMQ Delay)</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-100 text-zinc-900">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">Redis & MySQL State</h3>
              <p className="text-[11px] text-zinc-500">Persistence & Recovery</p>
            </div>
          </div>
          <div className="text-xs text-zinc-600 space-y-1 leading-relaxed">
            <div className="flex justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500">Redis Storage:</span>
              <span className="font-semibold text-emerald-700">AOF / RDB Persistent</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500">Outbox Pattern:</span>
              <span className="font-semibold text-emerald-700">Transactional MySQL</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-500">Restart Recovery:</span>
              <span className="font-semibold text-emerald-700">Crash-Safe & Idempotent</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-100 text-zinc-900">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">Rate-Limit Strategy</h3>
              <p className="text-[11px] text-zinc-500">Atomic Coordination</p>
            </div>
          </div>
          <div className="text-xs text-zinc-600 space-y-1 leading-relaxed">
            <div className="flex justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500">Coordination Engine:</span>
              <span className="font-semibold text-zinc-900">Redis Lua Scripting</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500">On Limit Reached:</span>
              <span className="font-semibold text-amber-700">Reschedule (Never Drop)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-500">Slack Deduplication:</span>
              <span className="font-semibold text-zinc-900">1 alert per window</span>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Bull Board Panel */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-zinc-900">
              Bull Board Interactive Dashboard
            </h2>
          </div>
          <a
            href="http://localhost:8383/admin/queues"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-zinc-600 hover:text-zinc-950 inline-flex items-center gap-1"
          >
            Open in new window
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="h-[620px] w-full bg-zinc-100 relative">
          <iframe
            src="http://localhost:8383/admin/queues"
            title="BullMQ Dashboard"
            className="w-full h-full border-0"
            onError={() => {}}
          />
        </div>
      </div>
    </div>
  );
};
