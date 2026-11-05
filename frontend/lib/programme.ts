import type { ProgrammeDay, ProgrammeSession } from './events';

/** Programmes are published in Nigerian time, whatever the viewer's timezone. */
const EVENT_TIMEZONE = 'Africa/Lagos';

/** Current date ("2027-01-23") and minutes since midnight in Lagos. */
export function lagosNow(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: EVENT_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

function toMinutes(value?: string | null) {
  if (!value) return null;
  const twentyFour = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (twentyFour) return Number(twentyFour[1]) * 60 + Number(twentyFour[2]);
  const twelve = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.exec(value.trim());
  if (!twelve) return null;
  const hours = (Number(twelve[1]) % 12) + (twelve[3].toUpperCase() === 'PM' ? 12 : 0);
  return hours * 60 + Number(twelve[2]);
}

/** "14:00" → "2:00 PM". Legacy labels pass through unchanged. */
export function formatTime(value?: string | null) {
  const minutes = toMinutes(value);
  if (minutes === null) return value ?? '';
  const hours = Math.floor(minutes / 60);
  return `${hours % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}

export const sessionStart = (session: ProgrammeSession) => session.start ?? session.time ?? null;

/** The day to open on: today if it is a programme day, else the next one, else the first. */
export function defaultDayIndex(programme: ProgrammeDay[], today = lagosNow().date) {
  const todayIndex = programme.findIndex((day) => day.date === today);
  if (todayIndex >= 0) return todayIndex;
  const nextIndex = programme.findIndex((day) => day.date && day.date > today);
  return nextIndex >= 0 ? nextIndex : 0;
}

export type SessionState = 'past' | 'now' | 'next' | 'later';

/**
 * Where each session sits relative to now. A session without an end time
 * runs until the next one starts (or the end of the day).
 */
export function sessionStates(day: ProgrammeDay, now = lagosNow()): SessionState[] {
  if (!day.date || day.date < now.date) return day.sessions.map(() => 'past');
  if (day.date > now.date) return day.sessions.map((_, index) => (index === 0 ? 'next' : 'later'));

  let nextMarked = false;
  return day.sessions.map((session, index) => {
    const start = toMinutes(sessionStart(session));
    const end = toMinutes(session.end) ?? toMinutes(sessionStart(day.sessions[index + 1] ?? {} as ProgrammeSession)) ?? 24 * 60;
    if (start === null) return 'later';
    if (now.minutes >= end) return 'past';
    if (now.minutes >= start) return 'now';
    if (!nextMarked) { nextMarked = true; return 'next'; }
    return 'later';
  });
}

/** "Sat 23 Jan" style label for a Y-m-d date, falling back to the admin label. */
export function dayLabel(day: ProgrammeDay) {
  if (!day.date) return day.day;
  const date = new Date(`${day.date}T12:00:00Z`);
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date);
}
