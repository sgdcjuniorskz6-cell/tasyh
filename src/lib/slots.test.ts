import { describe, expect, it } from 'vitest';
import {
  computeAvailableSlots,
  isMasterWorkingOnDate,
  minutesToTime,
  parseTimeToMinutes,
} from './slots';
import type { MasterSchedule, MasterTimeOff } from '../types/booking';

const makeSchedule = (overrides: Partial<MasterSchedule> = {}): MasterSchedule => ({
  id: 'sched-1',
  master_id: 'm1',
  day_of_week: 3, // Wednesday (2026-11-11 is Wednesday)
  is_working: true,
  start_time: '10:00',
  end_time: '18:00',
  break_start: '13:00',
  break_end: '14:00',
  ...overrides,
});

describe('time helpers', () => {
  it('parses and formats HH:MM strings accurately', () => {
    expect(parseTimeToMinutes('10:30')).toBe(630);
    expect(parseTimeToMinutes('09:05:00')).toBe(545);
    expect(minutesToTime(630)).toBe('10:30');
    expect(minutesToTime(545)).toBe('09:05');
  });
});

describe('isMasterWorkingOnDate', () => {
  it('returns false when date is in timeOffs', () => {
    const schedules = [makeSchedule()];
    const timeOffs: MasterTimeOff[] = [
      { id: 'off-1', master_id: 'm1', off_date: '2026-11-11', reason: 'Vacation' },
    ];
    expect(isMasterWorkingOnDate('2026-11-11', schedules, timeOffs)).toBe(false);
  });

  it('returns false when weekday is marked non-working', () => {
    const schedules = [makeSchedule({ is_working: false })];
    expect(isMasterWorkingOnDate('2026-11-11', schedules, [])).toBe(false);
  });

  it('returns true for working weekday without time off', () => {
    const schedules = [makeSchedule({ is_working: true })];
    expect(isMasterWorkingOnDate('2026-11-11', schedules, [])).toBe(true);
  });
});

describe('computeAvailableSlots', () => {
  it('excludes break overlap, closing boundary, and busy intervals', () => {
    const slots = computeAvailableSlots({
      dateStr: '2026-11-18', // Future Wednesday
      durationMinutes: 60,
      intervalMinutes: 30,
      schedules: [makeSchedule()],
      timeOffs: [],
      busyIntervals: [{ start_time: '11:00', end_time: '12:00' }],
      now: new Date(2026, 10, 11, 9, 0),
    });

    const times = slots.map((s) => s.time);

    // 10:00 fits (10:00-11:00)
    expect(times).toContain('10:00');
    // 10:30 overlaps 11:00-12:00 booking
    expect(times).not.toContain('10:30');
    // 11:00 and 11:30 overlap 11:00-12:00 booking
    expect(times).not.toContain('11:00');
    expect(times).not.toContain('11:30');
    // 12:00 fits (12:00-13:00) right before break
    expect(times).toContain('12:00');
    // 12:30, 13:00, 13:30 overlap 13:00-14:00 break
    expect(times).not.toContain('12:30');
    expect(times).not.toContain('13:00');
    expect(times).not.toContain('13:30');
    // 14:00 fits after break
    expect(times).toContain('14:00');
    // 17:00 fits (17:00-18:00), 17:30 would end at 18:30 > 18:00
    expect(times).toContain('17:00');
    expect(times).not.toContain('17:30');
  });

  it('filters out past slots when date is today', () => {
    const slots = computeAvailableSlots({
      dateStr: '2026-11-11',
      durationMinutes: 30,
      intervalMinutes: 30,
      schedules: [makeSchedule({ break_start: null, break_end: null })],
      timeOffs: [],
      busyIntervals: [],
      now: new Date(2026, 10, 11, 15, 20), // 15:20 local
      minLeadMinutes: 15, // earliest allowed >= 15:35 -> 16:00
    });

    const times = slots.map((s) => s.time);
    expect(times[0]).toBe('16:00');
    expect(times).not.toContain('15:30');
  });

  it('returns empty array on time-off date or past date', () => {
    const schedules = [makeSchedule()];
    expect(
      computeAvailableSlots({
        dateStr: '2026-11-10', // past
        durationMinutes: 30,
        intervalMinutes: 30,
        schedules,
        timeOffs: [],
        busyIntervals: [],
        now: new Date(2026, 10, 11, 9, 0),
      })
    ).toEqual([]);

    expect(
      computeAvailableSlots({
        dateStr: '2026-11-18',
        durationMinutes: 30,
        intervalMinutes: 30,
        schedules,
        timeOffs: [{ id: '1', master_id: 'm1', off_date: '2026-11-18', reason: 'Off' }],
        busyIntervals: [],
        now: new Date(2026, 10, 11, 9, 0),
      })
    ).toEqual([]);
  });
});

