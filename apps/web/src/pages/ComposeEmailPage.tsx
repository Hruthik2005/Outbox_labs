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
  ArrowLeft
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
    const d = new Date(Date.now() + 60 * 1000); // 1 minute in the future
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(100);

  // Recipient list states
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

  const processEmailList = (rawEmails: string[]) => {
    const seen = new Set<string>();
    const valid: string[] = [];
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
        valid.push(email);
      }
    }

    setRecipients(valid);
    setDuplicateCount(dups);
    setInvalidCount(invs);
  };

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
          processEmailList(extracted);
          setIsParsing(false);
          showToast(`Parsed ${extracted.length} recipient candidates from CSV`, 'info');
        },
        error: () => {
          showToast('Failed to parse CSV file', 'error');
          setIsParsing(false);
        }
      });
    } else {
      // Plain text file (one email per line)
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split(/[\r\n,;]+/);
        processEmailList(lines);
        setIsParsing(false);
        showToast(`Parsed ${lines.length} lines from file`, 'info');
      };
      reader.onerror = () => {
        showToast('Failed to read file', 'error');
        setIsParsing(false);
      };
      reader.readAsText(file);
    }
  };

  const removeRecipient = (index: number) => {
    setRecipients((prev) => prev.filter((_, i) => i !== index));
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
      showToast('Please upload or provide at least one valid recipient email', 'error');
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
          onClick={() => navigate(-1)}
          className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-600 hover:text-zinc-900 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Compose & Schedule</h1>
          <p className="text-xs text-zinc-500">Configure email content, upload recipients, and set dispatch pacing.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-5">
          {/* Sender Select */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Sender Account"
              value={selectedSenderId}
              onChange={handleSenderChange}
              options={[
                { label: '-- Select a sender account --', value: '' },
                ...senders.map((s) => ({
                  label: `${s.name} (${s.email}) - ${s.host}`,
                  value: s.id
                }))
              ]}
              helperText={
                senders.length === 0
                  ? 'No senders configured yet. Please add a sender in the Senders tab.'
                  : undefined
              }
            />

            <Input
              label="Subject Line"
              placeholder="e.g. Partnership discussion"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          {/* Email Body */}
          <Textarea
            label="Email Body (Plain text or HTML)"
            rows={6}
            placeholder="Write your email outreach message here..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />

          {/* Recipient Upload Section */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
              Recipient List Upload (CSV or TXT)
            </label>

            <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/60 p-6 text-center hover:border-zinc-300 transition-colors">
              <UploadCloud className="h-8 w-8 text-zinc-400 mb-2" />
              <p className="text-sm font-semibold text-zinc-800">
                Click or drag CSV / TXT file here
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Automatically extracts email addresses, removes duplicates, and filters invalid emails.
              </p>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>

            {/* Recipient Stats Summary */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-500 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Valid Recipients
                </div>
                <div className="text-xl font-bold text-zinc-900 mt-1">{recipients.length}</div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-500 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  Duplicates Filtered
                </div>
                <div className="text-xl font-bold text-zinc-600 mt-1">{duplicateCount}</div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-500 font-medium">
                  <XCircle className="h-3.5 w-3.5 text-rose-500" />
                  Invalid Excluded
                </div>
                <div className="text-xl font-bold text-zinc-600 mt-1">{invalidCount}</div>
              </div>
            </div>

            {/* Preview of Parsed Recipients */}
            {recipients.length > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 max-h-44 overflow-y-auto space-y-1.5">
                <div className="text-xs font-semibold text-zinc-600 mb-2">Recipient Preview:</div>
                <div className="flex flex-wrap gap-2">
                  {recipients.slice(0, 30).map((email, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => removeRecipient(idx)}
                        className="text-zinc-400 hover:text-rose-600 ml-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {recipients.length > 30 && (
                    <span className="text-xs text-zinc-400 self-center">
                      +{recipients.length - 30} more recipients
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scheduling & Pacing Settings Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-sm font-semibold text-zinc-950 uppercase tracking-wider">
            Dispatch Timing & Rate Limits
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="datetime-local"
              label="Schedule Start Date & Time"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
            />

            <Input
              type="number"
              min={0}
              max={3600}
              label="Delay Between Sends (Seconds)"
              helperText="Enforced across all parallel worker processes via Redis atomic pacing"
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(Number(e.target.value))}
              required
            />

            <Input
              type="number"
              min={1}
              max={10000}
              label="Hourly Rate Limit (Per Sender)"
              helperText="Auto-reschedules remaining jobs when limit is reached without dropping"
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
            Schedule {recipients.length > 0 ? `${recipients.length} Emails` : 'Campaign'}
          </Button>
        </div>
      </form>
    </div>
  );
};
