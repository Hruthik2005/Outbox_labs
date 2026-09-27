import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { slackApi } from '../services/slack-api';
import { senderApi } from '../services/sender-api';
import { SlackConnectionDto, SenderDto } from '@reachinbox/shared';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  Slack,
  Mail,
  Send,
  ExternalLink,
  Plus,
  Radio
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const [slackConnection, setSlackConnection] = useState<SlackConnectionDto | null>(null);
  const [isSlackConnected, setIsSlackConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSendingTestAlert, setIsSendingTestAlert] = useState(false);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [webhookInput, setWebhookInput] = useState('');
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [senders, setSenders] = useState<SenderDto[]>([]);

  const loadData = async () => {
    try {
      const [slackRes, sendersList] = await Promise.all([
        slackApi.getStatus().catch(() => ({ connected: false, connection: undefined })),
        senderApi.list().catch(() => [])
      ]);

      setIsSlackConnected(slackRes.connected);
      if ('connection' in slackRes && slackRes.connection) {
        setSlackConnection(slackRes.connection);
      }
      setSenders(sendersList);
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
    if (!window.confirm('Disconnect your Slack workspace from ReachInbox notifications?')) return;
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

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookInput || !webhookInput.startsWith('http')) {
      showToast('Please enter a valid Slack incoming webhook URL (https://hooks.slack.com/...)', 'error');
      return;
    }
    setIsSavingWebhook(true);
    try {
      const conn = await slackApi.connectWebhook(webhookInput);
      setSlackConnection(conn);
      setIsSlackConnected(true);
      setWebhookInput('');
      setShowWebhookForm(false);
      showToast('Slack webhook connected successfully!', 'success');
    } catch {
      showToast('Failed to connect Slack webhook', 'error');
    } finally {
      setIsSavingWebhook(false);
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

  const activeSender = senders.find((s) => s.isActive) || senders[0];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
          Integrations
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Connected notification channels and email delivery services.
        </p>
      </div>

      <div className="space-y-4">
        {/* Slack Integration */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4A154B] text-white shrink-0 shadow-xs">
                <Slack className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-zinc-950">Slack</h2>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium border ${
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
                <p className="text-xs text-zinc-500 mt-0.5">
                  {isSlackConnected && slackConnection
                    ? `Active on workspace: ${slackConnection.teamName}`
                    : 'Receive notifications for scheduled campaigns and rate-limit alerts.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              {isSlackConnected ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSendTestSlackAlert}
                    isLoading={isSendingTestAlert}
                    className="gap-1.5 text-xs text-zinc-700"
                  >
                    <Send className="h-3 w-3" />
                    Test Notification
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnectSlack}
                    isLoading={isDisconnecting}
                    className="text-xs text-zinc-500 hover:text-rose-600"
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleConnectSlack}
                    className="gap-2 bg-[#4A154B] hover:bg-[#3d113e] text-xs font-medium"
                  >
                    <Slack className="h-3.5 w-3.5" />
                    Connect Slack
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowWebhookForm(!showWebhookForm)}
                    className="text-xs"
                  >
                    {showWebhookForm ? 'Cancel' : 'Webhook URL'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Optional Webhook Form */}
          {!isSlackConnected && showWebhookForm && (
            <form onSubmit={handleSaveWebhook} className="mt-4 pt-4 border-t border-zinc-100 flex gap-2">
              <input
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={webhookInput}
                onChange={(e) => setWebhookInput(e.target.value)}
                className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                required
              />
              <Button size="sm" type="submit" isLoading={isSavingWebhook} className="text-xs">
                Connect
              </Button>
            </form>
          )}
        </div>

        {/* Email Sender (SMTP) */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-950 text-white shrink-0 shadow-xs">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-zinc-950">Email Sender (SMTP)</h2>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                      activeSender
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        activeSender ? 'bg-emerald-500' : 'bg-zinc-400'
                      }`}
                    />
                    {activeSender ? 'Active' : 'No Senders'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {activeSender
                    ? `${activeSender.name} (${activeSender.email})`
                    : 'Configure an SMTP sender account for dispatching outgoing emails.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <Link to="/senders">
                <Button size="sm" variant="outline" className="text-xs gap-1.5">
                  {activeSender ? 'Manage Senders' : 'Add Sender'}
                  <ExternalLink className="h-3 w-3 text-zinc-400" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
