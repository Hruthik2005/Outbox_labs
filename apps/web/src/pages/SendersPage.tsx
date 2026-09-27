import React, { useState, useEffect } from 'react';
import { senderApi } from '../services/sender-api';
import { SenderDto, CreateSenderRequest } from '@reachinbox/shared';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useToast } from '../hooks/useToast';
import {
  Layers,
  Plus,
  Server,
  Trash2,
  CheckCircle2,
  XCircle,
  Radio,
  Clock,
  Gauge
} from 'lucide-react';

export const SendersPage: React.FC = () => {
  const { showToast } = useToast();
  const [senders, setSenders] = useState<SenderDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New sender form states
  const [formData, setFormData] = useState<CreateSenderRequest>({
    name: 'Ethereal Test Sender',
    email: '',
    host: 'smtp.ethereal.email',
    port: 587,
    username: '',
    password: '',
    secure: false,
    hourlyLimit: 100,
    minimumDelaySeconds: 2
  });

  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadSenders = async () => {
    try {
      const data = await senderApi.list();
      setSenders(data);
    } catch (err) {
      console.error('Failed to load senders', err);
      showToast('Error loading senders list', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSenders();
  }, []);

  const handleTestConnection = async () => {
    if (!formData.host || !formData.username || !formData.password) {
      showToast('Host, username, and password are required to test connection', 'error');
      return;
    }

    setIsTesting(true);
    try {
      const ok = await senderApi.testConnection({
        host: formData.host,
        port: Number(formData.port),
        username: formData.username,
        password: formData.password,
        secure: formData.secure
      });

      if (ok) {
        showToast('SMTP connection test succeeded!', 'success');
      } else {
        showToast('SMTP connection failed. Check host, port, and credentials.', 'error');
      }
    } catch {
      showToast('Connection test failed with error.', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleCreateSender = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await senderApi.create({
        ...formData,
        port: Number(formData.port),
        hourlyLimit: Number(formData.hourlyLimit),
        minimumDelaySeconds: Number(formData.minimumDelaySeconds)
      });
      showToast('Sender account configured successfully!', 'success');
      setIsModalOpen(false);
      loadSenders();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      showToast(error.response?.data?.error?.message || 'Failed to save sender', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (sender: SenderDto) => {
    try {
      await senderApi.update(sender.id, { isActive: !sender.isActive });
      showToast(`Sender ${sender.isActive ? 'deactivated' : 'activated'}`, 'info');
      loadSenders();
    } catch {
      showToast('Failed to update sender state', 'error');
    }
  };

  const handleDeleteSender = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this sender account?')) return;
    try {
      await senderApi.delete(id);
      showToast('Sender removed', 'success');
      loadSenders();
    } catch {
      showToast('Failed to remove sender', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Email Senders</h1>
          <p className="text-xs text-zinc-500">
            Configure multiple SMTP test accounts, connection pooling, and sender-level rate limits.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Sender
        </Button>
      </div>

      {/* Senders Grid */}
      {isLoading ? (
        <LoadingSpinner className="py-20" />
      ) : senders.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No email senders configured"
          description="Add an Ethereal SMTP test account or custom SMTP credentials to start scheduling emails."
          actionLabel="Add First Sender"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {senders.map((sender) => (
            <div
              key={sender.id}
              className={`rounded-2xl border bg-white p-6 shadow-sm space-y-4 transition-all ${
                sender.isActive ? 'border-zinc-200' : 'border-zinc-200/60 opacity-65'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-zinc-950">{sender.name}</h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        sender.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                          : 'bg-zinc-100 text-zinc-500'
                      }`}
                    >
                      <Radio className="h-2 w-2" />
                      {sender.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">{sender.email}</p>
                </div>
                <button
                  onClick={() => handleDeleteSender(sender.id)}
                  className="text-zinc-400 hover:text-rose-600 transition-colors p-1"
                  title="Delete sender"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Host & Port */}
              <div className="rounded-xl bg-zinc-50 p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Server className="h-3 w-3" />
                    SMTP Server:
                  </span>
                  <span className="font-mono font-medium text-zinc-800">
                    {sender.host}:{sender.port}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Gauge className="h-3 w-3" />
                    Hourly Limit:
                  </span>
                  <span className="font-medium text-zinc-800">{sender.hourlyLimit} emails/hr</span>
                </div>
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Send Pacing:
                  </span>
                  <span className="font-medium text-zinc-800">
                    {sender.minimumDelaySeconds}s delay
                  </span>
                </div>
              </div>

              {/* Toggle Active Button */}
              <div className="pt-2 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(sender)}
                  className="w-full"
                >
                  {sender.isActive ? 'Deactivate Sender' : 'Activate Sender'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Sender Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Configure New Email Sender"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSender} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Sender Display Name"
              placeholder="e.g. Sales Outreach Team"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Sender Email Address"
              type="email"
              placeholder="napoleon.schaefer@ethereal.email"
              value={formData.email}
              onChange={(e) => {
                const val = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  email: val,
                  username: (!prev.username || prev.username === prev.email) ? val : prev.username
                }));
              }}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input
                label="SMTP Host"
                placeholder="smtp.ethereal.email"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                required
              />
            </div>
            <div>
              <Input
                label="Port"
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SMTP Username"
              placeholder="e.g. napoleon.schaefer@ethereal.email"
              helperText="Must be your Ethereal email address, not display name"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
            <Input
              label="SMTP Password"
              type="password"
              placeholder="••••••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Hourly Email Limit"
              type="number"
              min={1}
              value={formData.hourlyLimit}
              onChange={(e) => setFormData({ ...formData, hourlyLimit: Number(e.target.value) })}
              required
            />
            <Input
              label="Minimum Delay Between Sends (s)"
              type="number"
              min={0}
              value={formData.minimumDelaySeconds}
              onChange={(e) =>
                setFormData({ ...formData, minimumDelaySeconds: Number(e.target.value) })
              }
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              isLoading={isTesting}
            >
              Test Connection
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={isSaving}>
                Save Sender
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
