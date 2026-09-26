import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { slackApi } from '../services/slack-api';
import { SlackConnectionDto } from '@reachinbox/shared';
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
  User
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [slackConnection, setSlackConnection] = useState<SlackConnectionDto | null>(null);
  const [isSlackConnected, setIsSlackConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const loadSlackStatus = async () => {
    try {
      const res = await slackApi.getStatus();
      setIsSlackConnected(res.connected);
      if (res.connection) {
        setSlackConnection(res.connection);
      }
    } catch (err) {
      console.error('Failed to load Slack status', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSlackStatus();
  }, []);

  const handleConnectSlack = async () => {
    try {
      const { url } = await slackApi.getConnectUrl();
      window.location.href = url;
    } catch {
      showToast('Could not initiate Slack OAuth flow. Check SLACK_CLIENT_ID configuration.', 'error');
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

  if (isLoading) {
    return <LoadingSpinner className="py-20" />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Settings & Integrations</h1>
        <p className="text-xs text-zinc-500">
          Manage third-party integrations, OAuth connections, and view system observability dashboards.
        </p>
      </div>

      {/* Slack Integration Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4A154B] text-white shadow-sm">
              <Slack className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-950">Slack Rate Limit Alerts</h2>
              <p className="text-xs text-zinc-500">
                Receive instant notifications when a sender reaches its hourly limit and remaining jobs are rescheduled.
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
          <div className="rounded-xl bg-zinc-50 p-4 border border-zinc-100 text-xs text-zinc-600 space-y-1">
            <p className="font-medium text-zinc-900">How it works:</p>
            <p>
              When any configured sender hits its hourly sending quota, ReachInbox will send a single deduplicated alert to your Slack workspace explaining that remaining jobs were automatically rescheduled to the next window.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100">
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

      {/* User Profile Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-950">Google Account Profile</h2>
            <p className="text-xs text-zinc-500">Your authenticated identity and access credentials</p>
          </div>
        </div>

        {user && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
              <div className="text-zinc-500">Full Name</div>
              <div className="text-sm font-semibold text-zinc-900 mt-0.5">{user.name}</div>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
              <div className="text-zinc-500">Email Address</div>
              <div className="text-sm font-semibold text-zinc-900 mt-0.5">{user.email}</div>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
              <div className="text-zinc-500">Google ID</div>
              <div className="text-sm font-mono text-zinc-700 mt-0.5 truncate">{user.googleId}</div>
            </div>
          </div>
        )}
      </div>

      {/* Observability Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-950">Queue & Infrastructure Monitor</h2>
              <p className="text-xs text-zinc-500">
                Live inspection of BullMQ queue state, worker events, and service health
              </p>
            </div>
          </div>
          <a
            href="http://localhost:8383/admin/queues"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            Launch Bull Board
            <ExternalLink className="h-3.5 w-3.5 text-zinc-500" />
          </a>
        </div>
      </div>
    </div>
  );
};
