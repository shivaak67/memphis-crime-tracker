/** Date helpers for filters and API query strings. */

export function toInputDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function daysAgoInput(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toInputDate(d);
}

export function todayInput(): string {
  return toInputDate(new Date());
}
