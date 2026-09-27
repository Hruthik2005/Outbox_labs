import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { emailApi } from '../services/email-api';
import { senderApi } from '../services/sender-api';
import { SenderDto } from '@reachinbox/shared';
import { useToast } from '../hooks/useToast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  Calendar,
  Clock,
  Send,
  ArrowLeft,
  PenLine,
  FileText,
  Plus,
  Zap,
  X
} from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ComposeEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [senders, setSenders] = useState<SenderDto[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');

  const [startAt, setStartAt] = useState<string>(() => {
    const d = new Date(Date.now() + 60 * 1000); // 1 minute in future default
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(100);

  // Recipient input mode: 'manual' | 'upload'
  const [recipientMode, setRecipientMode] = useState<'manual' | 'upload'>('manual');
  const [singleEmail, setSingleEmail] = useState<string>('');
  const [bulkManualEmails, setBulkManualEmails] = useState<string>('');

  // Parsed recipient list states
  const [recipients, setRecipients] = useState<string[]>([]);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);
  const [invalidCount, setInvalidCount] = useState<number>(0);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    async function fetchSenders() {
      try {
        const list = await senderApi.list();
        setSenders(list);
        const active = list.find((s) => s.isActive);
        if (active) {
          setSelectedSenderId(active.id);
          setDelaySeconds(active.minimumDelaySeconds || 2);
          setHourlyLimit(active.hourlyLimit || 100);
        }
      } catch (err) {
        console.error('Failed to load senders', err);
      }
    }
    fetchSenders();
  }, []);

  const handleSenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedSenderId(id);
    const s = senders.find((item) => item.id === id);
    if (s) {
      setDelaySeconds(s.minimumDelaySeconds);
      setHourlyLimit(s.hourlyLimit);
    }
  };

  /**
   * Processes raw emails (validates, deduplicates, and appends to existing recipients)
   */
  const addEmailsToList = (rawEmails: string[]) => {
    const seen = new Set(recipients);
    const newValid: string[] = [];
    let dups = 0;
    let invs = 0;

    for (const raw of rawEmails) {
      const email = raw.trim().toLowerCase();
      if (!email) continue;

      if (!EMAIL_REGEX.test(email)) {
        invs++;
        continue;
      }

      if (seen.has(email)) {
        dups++;
      } else {
        seen.add(email);
        newValid.push(email);
      }
    }

    if (newValid.length > 0) {
      setRecipients((prev) => [...prev, ...newValid]);
      showToast(`Added ${newValid.length} recipient${newValid.length > 1 ? 's' : ''}`, 'success');
    } else if (dups > 0 || invs > 0) {
      showToast(`No new valid emails added (${dups} duplicate, ${invs} invalid)`, 'info');
    }

    setDuplicateCount((prev) => prev + dups);
    setInvalidCount((prev) => prev + invs);
  };

  /**
   * Handle single email manually added (e.g. on Enter or button click)
   */
  const handleAddSingleEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!singleEmail.trim()) return;
    addEmailsToList([singleEmail.trim()]);
    setSingleEmail('');
  };

  /**
   * Handle bulk pasted / typed emails
   */
  const handleAddBulkManual = () => {
    if (!bulkManualEmails.trim()) return;
    const lines = bulkManualEmails.split(/[\r\n,;\s]+/);
    addEmailsToList(lines);
    setBulkManualEmails('');
  };

  /**
   * Handle CSV or TXT file upload
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        complete: (results) => {
          const extracted: string[] = [];
          for (const row of results.data as string[][]) {
            if (Array.isArray(row)) {
              for (const cell of row) {
                if (typeof cell === 'string' && cell.includes('@')) {
                  extracted.push(cell);
                }
              }
            }
          }
          addEmailsToList(extracted);
          setIsParsing(false);
          // Reset file input
          e.target.value = '';
        },
        error: () => {
          showToast('Failed to parse CSV file', 'error');
          setIsParsing(false);
          e.target.value = '';
        }
      });
    } else {
      // Plain text file (one email per line or comma-separated)
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split(/[\r\n,;]+/);
        addEmailsToList(lines);
        setIsParsing(false);
        e.target.value = '';
      };
      reader.onerror = () => {
        showToast('Failed to read text file', 'error');
        setIsParsing(false);
        e.target.value = '';
      };
      reader.readAsText(file);
    }
  };

  const removeRecipient = (index: number) => {
    setRecipients((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllRecipients = () => {
    setRecipients([]);
    setDuplicateCount(0);
    setInvalidCount(0);
  };

  /**
   * Set start time shortcuts
   */
  const setQuickStart = (minutesFromNow: number) => {
    const d = new Date(Date.now() + minutesFromNow * 60 * 1000);
    setStartAt(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSenderId) {
      showToast('Please select or configure an active sender account', 'error');
      return;
    }
    if (!subject.trim()) {
      showToast('Subject line is required', 'error');
      return;
    }
    if (!body.trim()) {
      showToast('Email body content is required', 'error');
      return;
    }
    if (recipients.length === 0) {
      showToast('Please provide at least one valid recipient email', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const scheduledDate = new Date(startAt);
      const res = await emailApi.scheduleEmails({
        senderId: selectedSenderId,
        subject,
        body,
        recipients,
        startAt: scheduledDate.toISOString(),
        minimumDelaySeconds: Number(delaySeconds),
        hourlyLimit: Number(hourlyLimit)
      });

      showToast(`Successfully scheduled ${res.scheduledCount} email jobs!`, 'success');
      navigate('/scheduled');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const msg = error.response?.data?.error?.message || 'Failed to schedule emails';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-600 hover:text-zinc-900 shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Compose Campaign</h1>
          <p className="text-xs text-zinc-500">Configure email content, enter recipients manually or via file, and schedule dispatch.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Configuration Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-5">
          {/* Sender Select & Subject */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Sender Account"
              value={selectedSenderId}
              onChange={handleSenderChange}
              options={[
                { label: '-- Select a sender account --', value: '' },
                ...senders.map((s) => ({
                  label: `${s.name} (${s.email})`,
                  value: s.id
                }))
              ]}
              helperText={
                senders.length === 0
                  ? 'No senders configured. Please add an SMTP sender in Integrations / Senders.'
                  : undefined
              }
            />

            <Input
              label="Subject Line"
              placeholder="e.g. Product Update & Partnership"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          {/* Email Body */}
          <Textarea
            label="Email Body"
            rows={5}
            placeholder="Write your email outreach message here..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />

          {/* Recipient Input Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                Recipients
              </label>

              {/* Mode Switcher Tabs */}
              <div className="flex items-center bg-zinc-100 p-0.5 rounded-xl text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setRecipientMode('manual')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    recipientMode === 'manual'
                      ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <PenLine className="h-3.5 w-3.5" />
                  Type Manually
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientMode('upload')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    recipientMode === 'upload'
                      ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  Upload CSV / TXT
                </button>
              </div>
            </div>

            {/* Manual Entry View */}
            {recipientMode === 'manual' ? (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-4">
                {/* Quick Single Email Add */}
                <div>
                  <div className="text-xs font-medium text-zinc-700 mb-1.5">
                    Add Single Email:
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="e.g. client@company.com"
                      value={singleEmail}
                      onChange={(e) => setSingleEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSingleEmail();
                        }
                      }}
                      className="bg-white"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleAddSingleEmail()}
                      disabled={!singleEmail.trim()}
                      className="gap-1.5 shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-zinc-200"></div>
                  <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                    Or Paste Multiple
                  </span>
                  <div className="flex-grow border-t border-zinc-200"></div>
                </div>

                {/* Bulk Paste Area */}
                <div className="space-y-2">
                  <Textarea
                    rows={3}
                    placeholder="Paste multiple emails separated by commas, spaces, or lines (e.g. user1@example.com, user2@test.com)"
                    value={bulkManualEmails}
                    onChange={(e) => setBulkManualEmails(e.target.value)}
                    className="bg-white text-xs font-mono"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddBulkManual}
                      disabled={!bulkManualEmails.trim()}
                      className="gap-1.5 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Emails
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* File Upload View */
              <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/60 p-6 text-center hover:border-zinc-300 transition-colors">
                <UploadCloud className="h-8 w-8 text-zinc-400 mb-2" />
                <p className="text-sm font-semibold text-zinc-800">
                  Click or drag CSV / TXT file here
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Automatically extracts emails, removes duplicates, and filters invalid entries.
                </p>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            )}

            {/* Recipient Stats Summary & Clear Button */}
            {recipients.length > 0 && (
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200/60">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    {recipients.length} Valid Recipient{recipients.length > 1 ? 's' : ''}
                  </span>

                  {duplicateCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 border border-amber-200/60">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      {duplicateCount} duplicates
                    </span>
                  )}

                  {invalidCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-800 border border-rose-200/60">
                      <XCircle className="h-3 w-3 text-rose-500" />
                      {invalidCount} invalid
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={clearAllRecipients}
                  className="text-xs text-zinc-400 hover:text-rose-600 transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Interactive Recipient Chips Preview */}
            {recipients.length > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-white p-3 max-h-48 overflow-y-auto space-y-1.5">
                <div className="flex flex-wrap gap-2">
                  {recipients.map((email, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-800 font-medium group hover:border-zinc-300 transition-colors"
                    >
                      <span className="font-mono text-xs">{email}</span>
                      <button
                        type="button"
                        onClick={() => removeRecipient(idx)}
                        className="text-zinc-400 hover:text-rose-600 transition-colors"
                        title="Remove recipient"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scheduling & Rate Limits Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-5">
          <h2 className="text-sm font-semibold text-zinc-950 uppercase tracking-wider">
            Dispatch Timing & Rate Limits
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Input
                type="datetime-local"
                label="Schedule Start Date & Time"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
              />
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[11px] text-zinc-400">Quick:</span>
                <button
                  type="button"
                  onClick={() => setQuickStart(0)}
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-colors"
                >
                  Send Now
                </button>
                <button
                  type="button"
                  onClick={() => setQuickStart(1)}
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-colors"
                >
                  +1 min
                </button>
                <button
                  type="button"
                  onClick={() => setQuickStart(10)}
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-colors"
                >
                  +10 min
                </button>
              </div>
            </div>

            <Input
              type="number"
              min={0}
              max={3600}
              label="Delay Between Sends (Seconds)"
              helperText="Enforced atomically across BullMQ workers via Redis"
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(Number(e.target.value))}
              required
            />

            <Input
              type="number"
              min={1}
              max={10000}
              label="Hourly Rate Limit (Per Sender)"
              helperText="Safe reschedule to next window with Slack alert on limit"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Number(e.target.value))}
              required
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="lg"
            isLoading={isSubmitting || isParsing}
            disabled={recipients.length === 0 || !selectedSenderId}
            className="gap-2 px-6"
          >
            <Send className="h-4 w-4" />
            Schedule {recipients.length > 0 ? `${recipients.length} Email${recipients.length > 1 ? 's' : ''}` : 'Campaign'}
          </Button>
        </div>
      </form>
    </div>
  );
};
