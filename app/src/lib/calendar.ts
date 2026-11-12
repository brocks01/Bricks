/**
 * "Add to calendar" without a native calendar library: a Google Calendar link with
 * the event filled in. It opens the Calendar app on Android and the browser on
 * iPhone, where the member taps Save.
 */
export function googleCalendarUrl(input: {
  title: string;
  start: Date;
  end: Date | null;
  place: string;
  details?: string;
}): string {
  const end = input.end ?? new Date(input.start.getTime() + 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates: `${utcStamp(input.start)}/${utcStamp(end)}`,
    location: input.place,
    ...(input.details ? { details: input.details } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** 2026-11-14T02:00:00Z → 20261114T020000Z (Google's compact UTC form). */
function utcStamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}
