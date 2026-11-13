import { STATUS_LABELS } from '../lib/i18n';
import type { AppointmentStatus, Language } from '../types/booking';

const STATUS_STYLES: Record<AppointmentStatus, { pill: string; dot: string }> = {
  pending: {
    pill: 'bg-amber-50 text-amber-900 border-amber-200/80',
    dot: 'bg-amber-500',
  },
  confirmed: {
    pill: 'bg-emerald-50 text-emerald-900 border-emerald-200/80',
    dot: 'bg-emerald-500',
  },
  completed: {
    pill: 'bg-stone-100 text-stone-700 border-stone-200',
    dot: 'bg-stone-500',
  },
  cancelled: {
    pill: 'bg-rose-50 text-rose-900 border-rose-200/80',
    dot: 'bg-rose-500',
  },
};

export function StatusBadge({
  status,
  lang,
}: {
  status: AppointmentStatus;
  lang: Language;
}) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${style.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {STATUS_LABELS[lang][status]}
    </span>
  );
}

