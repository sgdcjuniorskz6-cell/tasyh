import type {
  AppointmentStatus,
  AvailableSlot,
  Language,
  MasterSchedule,
  MasterTimeOff,
  TimeInterval,
} from '../types/booking';

/** Convert "HH:MM" or "HH:MM:SS" to minutes since midnight */
export function parseTimeToMinutes(time: string): number {
  const parts = time.trim().split(':');
  const hours = Number(parts[0] ?? 0);
  const mins = Number(parts[1] ?? 0);
  return hours * 60 + mins;
}

/** Convert minutes since midnight to "HH:MM" */
export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/** Normalize "HH:MM:SS" -> "HH:MM" */
export function normalizeTime(time: string): string {
  return time.slice(0, 5);
}

/** Local YYYY-MM-DD formatting without UTC timezone shift */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD into a local Date at midnight */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

/** Add N days to a Date */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

/** Determine whether a master works on a given YYYY-MM-DD date */
export function isMasterWorkingOnDate(
  dateStr: string,
  schedules: MasterSchedule[],
  timeOffs: MasterTimeOff[]
): boolean {
  if (timeOffs.some((t) => t.off_date === dateStr)) {
    return false;
  }
  const dow = parseLocalDate(dateStr).getDay();
  const schedule = schedules.find((s) => s.day_of_week === dow);
  return Boolean(schedule && schedule.is_working);
}

export interface ComputeSlotsOptions {
  dateStr: string;
  durationMinutes: number;
  intervalMinutes: number;
  schedules: MasterSchedule[];
  timeOffs: MasterTimeOff[];
  busyIntervals: TimeInterval[];
  /** Pass current Date for deterministic tests; defaults to new Date() */
  now?: Date;
  /** Minimum notice in minutes before a slot today (default: 15) */
  minLeadMinutes?: number;
}

/**
 * Compute bookable start slots for a stylist on a given date,
 * accounting for working hours, breaks, time-offs, existing bookings,
 * service duration, and current time (if booking today).
 */
export function computeAvailableSlots(options: ComputeSlotsOptions): AvailableSlot[] {
  const {
    dateStr,
    durationMinutes,
    intervalMinutes,
    schedules,
    timeOffs,
    busyIntervals,
    now = new Date(),
    minLeadMinutes = 15,
  } = options;

  if (durationMinutes <= 0 || intervalMinutes <= 0) return [];
  if (timeOffs.some((t) => t.off_date === dateStr)) return [];

  const dow = parseLocalDate(dateStr).getDay();
  const schedule = schedules.find((s) => s.day_of_week === dow);
  if (!schedule || !schedule.is_working) return [];

  const workStart = parseTimeToMinutes(schedule.start_time);
  const workEnd = parseTimeToMinutes(schedule.end_time);
  if (workEnd <= workStart) return [];

  const hasBreak = Boolean(schedule.break_start && schedule.break_end);
  const breakStart = hasBreak ? parseTimeToMinutes(schedule.break_start!) : -1;
  const breakEnd = hasBreak ? parseTimeToMinutes(schedule.break_end!) : -1;

  const busy = busyIntervals.map((b) => ({
    start: parseTimeToMinutes(b.start_time),
    end: parseTimeToMinutes(b.end_time),
  }));

  const todayStr = toLocalDateString(now);
  if (dateStr < todayStr) return [];

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const earliestAllowedStart =
    dateStr === todayStr ? nowMinutes + minLeadMinutes : -1;

  const slots: AvailableSlot[] = [];

  for (
    let start = workStart;
    start + durationMinutes <= workEnd;
    start += intervalMinutes
  ) {
    const end = start + durationMinutes;

    if (earliestAllowedStart >= 0 && start < earliestAllowedStart) {
      continue;
    }

    if (hasBreak && start < breakEnd && end > breakStart) {
      continue;
    }

    const overlapsBooking = busy.some(
      (b) => start < b.end && end > b.start
    );
    if (overlapsBooking) {
      continue;
    }

    const period: AvailableSlot['period'] =
      start < 12 * 60 ? 'morning' : start < 17 * 60 ? 'afternoon' : 'evening';

    slots.push({
      time: minutesToTime(start),
      endTime: minutesToTime(end),
      period,
    });
  }

  return slots;
}

export function formatPrice(amount: number, currency: string, lang: Language): string {
  const formatted = new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : 'en-US').format(amount);
  return currency === '$' || currency === '€'
    ? `${currency}${formatted}`
    : `${formatted} ${currency}`;
}

export function formatDuration(minutes: number, lang: Language): string {
  if (minutes < 60) {
    return lang === 'ru' ? `${minutes} мин` : `${minutes} min`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (lang === 'ru') {
    return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
  }
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatDateReadable(dateStr: string, lang: Language): string {
  const date = parseLocalDate(dateStr);
  return new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

export function isActiveBookingStatus(status: AppointmentStatus): boolean {
  return status === 'pending' || status === 'confirmed';
}

