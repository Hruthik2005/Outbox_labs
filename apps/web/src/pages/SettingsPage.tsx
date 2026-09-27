import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { slackApi } from '../services/slack-api';
import { senderApi } from '../services/sender-api';
import { apiClient } from '../services/api-client';
import { SlackConnectionDto, SenderDto } from '@reachinbox/shared';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  Slack,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Activity,
  Server,
  User,
  Send,
  Layers,
  BellRing,
  Plus,
  Radio
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [slackConnection, setSlackConnection] = useState<SlackConnectionDto | null>(null);
  const [isSlackConnected, setIsSlackConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSendingTestAlert, setIsSendingTestAlert] = useState(false);
  const [senders, setSenders] = useState<SenderDto[]>([]);
  const [health, setHealth] = useState<{ status: string; services: Record<string, string> } | null>(null);

  const loadData = async () => {
    try {
      const [slackRes, sendersList, healthRes] = await Promise.all([
        slackApi.getStatus().catch(() => ({ connected: false, connection: undefined })),
        senderApi.list().catch(() => []),
        apiClient.get('/health').then((r) => r.data?.data).catch(() => null)
      ]);

      setIsSlackConnected(slackRes.connected);
      if ('connection' in slackRes && slackRes.connection) {
        setSlackConnection(slackRes.connection);
      }
      setSenders(sendersList);
      setHealth(healthRes);
    } catch (err) {
      console.error('Failed to load settings data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConnectSlack = async () => {
    try {
      const { url } = await slackApi.getConnectUrl();
      window.location.href = url;
    } catch {
      showToast('Could not initiate Slack OAuth flow. Check SLACK_CLIENT_ID configuration in .env.', 'error');
    }
  };

  const handleDisconnectSlack = async () => {
    if (!window.confirm('Disconnect your Slack workspace from ReachInbox rate-limit alerts?')) return;
    setIsDisconnecting(true);
    try {
      await slackApi.disconnect();
      setIsSlackConnected(false);
      setSlackConnection(null);
      showToast('Slack disconnected successfully', 'success');
    } catch {
      showToast('Failed to disconnect Slack', 'error');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSendTestSlackAlert = async () => {
    setIsSendingTestAlert(true);
    try {
      const res = await slackApi.sendTestAlert();
      showToast(res.message || 'Test alert delivered to your Slack channel!', 'success');
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message || 'Could not send test Slack alert. Ensure Slack is connected.';
      showToast(errorMsg, 'error');
    } finally {
      setIsSendingTestAlert(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner className="py-24" size="lg" />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
          Integrations & System Settings
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Manage third-party Slack OAuth, email sender accounts, Google profile, and system infrastructure.
        </p>
      </div>

      {/* Target Account Info Banner */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-xs">
            <User className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-950">
                Primary Account: {user?.email || 'vvce23cse0102@vvce.ac.in'}
              </h2>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                Active & Verified
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Integrated with Google OAuth session and linked Slack rate-limit webhook dispatcher.
            </p>
          </div>
        </div>
      </div>

      {/* Slack Integration Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4A154B] text-white shadow-xs">
              <Slack className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-950">Slack Rate-Limit Webhook Integration</h2>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Automatically posts real-time alerts when any sender reaches its hourly limit, ensuring zero silent drops.
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
              isSlackConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-zinc-100 text-zinc-600 border-zinc-200'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isSlackConnected ? 'bg-emerald-500' : 'bg-zinc-400'
              }`}
            />
            {isSlackConnected ? 'Connected' : 'Not Connected'}
          </span>
        </div>

        {isSlackConnected && slackConnection ? (
          <div className="rounded-xl bg-zinc-50 p-4 border border-zinc-100 space-y-2 text-xs">
            <div className="flex justify-between text-zinc-600">
              <span className="font-medium">Connected Workspace:</span>
              <span className="font-semibold text-zinc-900">{slackConnection.teamName}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span className="font-medium">Notification Recipient:</span>
              <span className="font-mono text-zinc-800">{user?.email || 'vvce23cse0102@vvce.ac.in'}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span className="font-medium">Connected On:</span>
              <span className="text-zinc-800">
                {new Date(slackConnection.connectedAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span className="font-medium">Granted Scopes:</span>
              <span className="font-mono text-zinc-800">{slackConnection.scopes}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-zinc-50 p-4 border border-zinc-100 text-xs text-zinc-600 space-y-1.5">
            <p className="font-medium text-zinc-900">Configured Notification Route:</p>
            <p>
              Target user: <span className="font-semibold text-zinc-900">{user?.email || 'vvce23cse0102@vvce.ac.in'}</span>.
              When a sender account hits its hourly email threshold, remaining jobs are safely rescheduled and ReachInbox sends a deduplicated notification to your Slack workspace.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendTestSlackAlert}
              isLoading={isSendingTestAlert}
              className="gap-2 text-zinc-700"
            >
              <BellRing className="h-3.5 w-3.5" />
              Send Test Slack Alert
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {isSlackConnected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnectSlack}
                isLoading={isDisconnecting}
                className="text-rose-600 hover:text-rose-700"
              >
                Disconnect Workspace
              </Button>
            ) : (
              <Button size="sm" onClick={handleConnectSlack} className="gap-2 bg-[#4A154B] hover:bg-[#3d113e]">
                <Slack className="h-4 w-4" />
                Connect Slack
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Senders Configuration Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-xs">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-950">Configured Email Senders</h2>
              <p className="text-xs text-zinc-500">
                SMTP test accounts, connection pooling, and sender-level rate limits
              </p>
            </div>
          </div>
          <Link to="/senders">
            <Button size="sm" variant="outline" className="gap-2">
              <Plus className="h-3.5 w-3.5" />
              Manage Senders ({senders.length})
            </Button>
          </Link>
        </div>

        {senders.length === 0 ? (
          <div className="rounded-xl bg-zinc-50 p-6 text-center text-xs text-zinc-500 border border-zinc-100">
            No senders configured. Add an Ethereal SMTP test account in the Senders tab.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {senders.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/50 p-3.5 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900">{s.name}</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        s.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-200 text-zinc-600'
                      }`}
                    >
                      <Radio className="h-2 w-2" />
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-zinc-500">{s.email}</p>
                </div>
                <div className="text-right text-[11px] text-zinc-500 space-y-0.5">
                  <p className="font-mono text-zinc-700">{s.host}:{s.port}</p>
                  <p>{s.hourlyLimit} emails/hr • {s.minimumDelaySeconds}s delay</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Google OAuth Profile Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-950">Google OAuth Authentication</h2>
            <p className="text-xs text-zinc-500">Session state and cryptographic identity authentication</p>
          </div>
        </div>

        {user && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3.5">
              <div className="text-zinc-500 font-medium">User Name</div>
              <div className="text-sm font-semibold text-zinc-900 mt-1">{user.name}</div>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3.5">
              <div className="text-zinc-500 font-medium">Email Address</div>
              <div className="text-sm font-semibold text-zinc-900 mt-1">{user.email}</div>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3.5">
              <div className="text-zinc-500 font-medium">Google OAuth Identity ID</div>
              <div className="text-sm font-mono text-zinc-700 mt-1 truncate">{user.googleId}</div>
            </div>
          </div>
        )}
      </div>

      {/* System Infrastructure Health Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-950">System Infrastructure</h2>
              <p className="text-xs text-zinc-500">
                Core database, BullMQ queue, and search index operational statuses
              </p>
            </div>
          </div>
          <Link to="/queue-monitor">
            <Button size="sm" variant="outline" className="gap-2">
              <Activity className="h-3.5 w-3.5" />
              Open Queue Monitor
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3.5 flex items-center justify-between">
            <span className="text-zinc-600 font-medium">MySQL Relational DB:</span>
            <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {health?.services?.database || 'Connected'}
            </span>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3.5 flex items-center justify-between">
            <span className="text-zinc-600 font-medium">Redis + BullMQ Queue:</span>
            <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {health?.services?.redis || 'Connected'}
            </span>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3.5 flex items-center justify-between">
            <span className="text-zinc-600 font-medium">Elasticsearch Service:</span>
            <span className="font-semibold text-zinc-800 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              {health?.services?.elasticsearch || 'Online'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
