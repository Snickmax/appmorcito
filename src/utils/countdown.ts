import {
  CountdownCoupleMember,
  CountdownTimeParts,
  WishlistPriority,
} from '../types/countdown';

export function parseYmdAsLocalDate(value: string | null | undefined) {
  if (!value) return null;

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function formatDateLong(value: string | Date | null | undefined) {
  if (!value) return '--';

  const date = typeof value === 'string' ? parseYmdAsLocalDate(value) : value;

  if (!date) return '--';

  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function getSafeAnnualOccurrence(baseDate: Date, year: number) {
  const month = baseDate.getMonth();
  const day = baseDate.getDate();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

  return new Date(
    year,
    month,
    Math.min(day, lastDayOfMonth),
    0,
    0,
    0,
    0
  );
}

function startOfToday(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

export function isSameMonthDay(dateA: Date, dateB: Date) {
  return (
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

export function isBirthdayToday(
  birthDate: string | null | undefined,
  now: Date = new Date()
) {
  const base = parseYmdAsLocalDate(birthDate);
  if (!base) return false;
  return isSameMonthDay(base, now);
}

export function getNextAnniversaryDate(
  relationshipStartDate: string | null | undefined,
  now: Date = new Date()
) {
  const base = parseYmdAsLocalDate(relationshipStartDate);

  if (!base) return null;

  const today = startOfToday(now);
  let next = getSafeAnnualOccurrence(base, today.getFullYear());

  if (next < today) {
    next = getSafeAnnualOccurrence(base, today.getFullYear() + 1);
  }

  return next;
}

export function getNextBirthdayDate(
  birthDate: string | null | undefined,
  now: Date = new Date()
) {
  const base = parseYmdAsLocalDate(birthDate);

  if (!base) return null;

  const today = startOfToday(now);
  let next = getSafeAnnualOccurrence(base, today.getFullYear());

  if (next < today) {
    next = getSafeAnnualOccurrence(base, today.getFullYear() + 1);
  }

  return next;
}

export function getCountdownParts(
  targetDate: Date | null,
  now: Date = new Date()
): CountdownTimeParts {
  if (!targetDate) {
    return {
      totalDays: 0,
      days: '000',
      hours: '00',
      minutes: '00',
      seconds: '00',
      isPast: true,
    };
  }

  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return {
      totalDays: 0,
      days: '000',
      hours: '00',
      minutes: '00',
      seconds: '00',
      isPast: true,
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const totalDays = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  return {
    totalDays,
    days: String(totalDays).padStart(3, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
    isPast: false,
  };
}

export function getDisplayName(member: CountdownCoupleMember | null | undefined) {
  if (!member) return 'Mi amorcito';

  return (
    member.nickname?.trim() ||
    member.display_name?.trim() ||
    member.email?.trim() ||
    'Mi amorcito'
  );
}

export function formatPriorityLabel(priority: WishlistPriority) {
  switch (priority) {
    case 'high':
      return 'Alta';
    case 'medium':
      return 'Media';
    case 'low':
      return 'Baja';
    default:
      return priority;
  }
}

export function formatMoney(
  value: number | null | undefined,
  currency: string = 'CLP'
) {
  if (value == null || Number.isNaN(value)) return null;

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'CLP' ? 0 : 2,
  }).format(value);
}