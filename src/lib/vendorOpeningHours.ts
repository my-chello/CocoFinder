export const VENDOR_OPENING_DAY_OPTIONS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
  'Mon-Fri',
  'Sat-Sun',
  'Daily',
] as const;

export type VendorOpeningDayOption = (typeof VENDOR_OPENING_DAY_OPTIONS)[number];

export type VendorOpeningHoursRow = {
  id: string;
  dayGroup: VendorOpeningDayOption | '';
  openTime: string;
  closeTime: string;
};

type SerializedVendorOpeningHoursRow = Omit<VendorOpeningHoursRow, 'id'> & { id?: string };

const VENDOR_OPENING_HOURS_PREFIX = 'cocofinder-hours:v1:';

export function createEmptyVendorOpeningHoursRow() {
  return {
    id: `opening-row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    dayGroup: '',
    openTime: '',
    closeTime: '',
  } satisfies VendorOpeningHoursRow;
}

export function isValidVendorOpeningDayOption(value: string): value is VendorOpeningDayOption {
  return VENDOR_OPENING_DAY_OPTIONS.includes(value as VendorOpeningDayOption);
}

export function isVendorOpeningHoursRowComplete(row: VendorOpeningHoursRow) {
  return (
    isValidVendorOpeningDayOption(row.dayGroup) &&
    row.openTime.trim().length > 0 &&
    row.closeTime.trim().length > 0
  );
}

export function getCompleteVendorOpeningHoursRows(rows: VendorOpeningHoursRow[]) {
  return rows.filter(isVendorOpeningHoursRowComplete);
}

export function getVendorOpeningHoursSummary(
  rows: VendorOpeningHoursRow[],
  separator = ' · '
) {
  return getCompleteVendorOpeningHoursRows(rows)
    .map((row) => `${row.dayGroup} ${row.openTime}-${row.closeTime}`)
    .join(separator);
}

export function serializeVendorOpeningHoursRows(rows: VendorOpeningHoursRow[]) {
  const normalizedRows = getCompleteVendorOpeningHoursRows(rows).map((row) => ({
    id: row.id,
    dayGroup: row.dayGroup,
    openTime: row.openTime,
    closeTime: row.closeTime,
  }));

  return `${VENDOR_OPENING_HOURS_PREFIX}${JSON.stringify(normalizedRows)}`;
}

export function parseVendorOpeningHoursValue(value?: string | null) {
  const rawValue = value?.trim() ?? '';

  if (!rawValue) {
    return {
      rows: [] as VendorOpeningHoursRow[],
      summary: '',
      legacySummary: '',
    };
  }

  if (rawValue.startsWith(VENDOR_OPENING_HOURS_PREFIX)) {
    try {
      const parsedRows = JSON.parse(
        rawValue.slice(VENDOR_OPENING_HOURS_PREFIX.length)
      ) as SerializedVendorOpeningHoursRow[];

      const rows = Array.isArray(parsedRows)
        ? parsedRows
            .filter(
              (row): row is SerializedVendorOpeningHoursRow =>
                typeof row === 'object' &&
                row !== null &&
                typeof row.dayGroup === 'string' &&
                typeof row.openTime === 'string' &&
                typeof row.closeTime === 'string' &&
                isValidVendorOpeningDayOption(row.dayGroup)
            )
            .map((row) => ({
              id: typeof row.id === 'string' && row.id.trim() ? row.id : createEmptyVendorOpeningHoursRow().id,
              dayGroup: row.dayGroup,
              openTime: row.openTime,
              closeTime: row.closeTime,
            }))
        : [];

      return {
        rows,
        summary: getVendorOpeningHoursSummary(rows),
        legacySummary: '',
      };
    } catch {
      return {
        rows: [] as VendorOpeningHoursRow[],
        summary: '',
        legacySummary: '',
      };
    }
  }

  return {
    rows: [] as VendorOpeningHoursRow[],
    summary: rawValue,
    legacySummary: rawValue,
  };
}

export function formatVendorTimeValue(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function getDateFromVendorTimeValue(value?: string) {
  const baseDate = new Date();
  baseDate.setSeconds(0, 0);

  if (!value) {
    baseDate.setHours(9, 0, 0, 0);
    return baseDate;
  }

  const [rawHours, rawMinutes] = value.split(':');
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    baseDate.setHours(9, 0, 0, 0);
    return baseDate;
  }

  baseDate.setHours(hours, minutes, 0, 0);
  return baseDate;
}
