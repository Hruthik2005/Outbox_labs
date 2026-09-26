import React from 'react';
import { EmailStatus } from '@reachinbox/shared';

export const StatusBadge: React.FC<{ status: EmailStatus | string }> = ({ status }) => {
  const normalized = status.toUpperCase();

  let styles = 'bg-zinc-100 text-zinc-800 border-zinc-200';
  let dotColor = 'bg-zinc-400';

  if (normalized === 'SENT' || normalized === 'COMPLETED') {
    styles = 'bg-emerald-50 text-emerald-800 border-emerald-200/60';
    dotColor = 'bg-emerald-500';
  } else if (normalized === 'FAILED') {
    styles = 'bg-rose-50 text-rose-800 border-rose-200/60';
    dotColor = 'bg-rose-500';
  } else if (normalized === 'SCHEDULED' || normalized === 'QUEUED') {
    styles = 'bg-zinc-100 text-zinc-800 border-zinc-300';
    dotColor = 'bg-zinc-700';
  } else if (normalized === 'PROCESSING' || normalized === 'IN_PROGRESS') {
    styles = 'bg-amber-50 text-amber-800 border-amber-200/60';
    dotColor = 'bg-amber-500 animate-pulse';
  } else if (normalized === 'CANCELLED') {
    styles = 'bg-zinc-50 text-zinc-500 border-zinc-200';
    dotColor = 'bg-zinc-300';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {normalized}
    </span>
  );
};
