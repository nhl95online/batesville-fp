/**
 * Billing Days & Corporate Holiday Calendar Service
 * Calculates exact billing days (Mon-Fri) excluding recognized US corporate holidays.
 * Supports Batesville Fiscal Years (October 1st – September 30th) dynamically across all years.
 */

export interface HolidayDetail {
  name: string;
  date: string; // YYYY-MM-DD
}

export interface MonthBillingInfo {
  fiscalMonth: number; // 1 to 12 (1 = Oct, 12 = Sep)
  monthCode: string;   // 'OCT', 'NOV', etc.
  monthName: string;   // 'Oct', 'Nov', etc.
  calYear: number;
  calMonth: number;    // 1 to 12
  totalDays: number;
  weekendDays: number;
  holidayDays: number;
  billingDays: number;
  holidays: HolidayDetail[];
}

/**
 * Returns the date of the N-th occurrence of a day of week in a month.
 * dayOfWeek: 0 = Sun, 1 = Mon, ..., 6 = Sat
 * n: 1 = 1st, 2 = 2nd, 3 = 3rd, 4 = 4th
 */
function getNthWeekdayOfMonth(year: number, month0: number, dayOfWeek: number, n: number): Date | null {
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(Date.UTC(year, month0, day));
    if (d.getUTCMonth() !== month0) break;
    if (d.getUTCDay() === dayOfWeek) {
      count++;
      if (count === n) return d;
    }
  }
  return null;
}

/**
 * Returns the date of the last occurrence of a day of week in a month.
 */
function getLastWeekdayOfMonth(year: number, month0: number, dayOfWeek: number): Date | null {
  let last: Date | null = null;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(Date.UTC(year, month0, day));
    if (d.getUTCMonth() !== month0) break;
    if (d.getUTCDay() === dayOfWeek) {
      last = d;
    }
  }
  return last;
}

/**
 * Calculates all observed corporate holidays for a given calendar year.
 * Standard corporate observance rules:
 * - If holiday falls on Saturday -> observed Friday before
 * - If holiday falls on Sunday -> observed Monday after
 */
export function getCorporateHolidaysForYear(calYear: number): HolidayDetail[] {
  const holidays: HolidayDetail[] = [];

  const addObserved = (name: string, fixedDate: Date) => {
    const dow = fixedDate.getUTCDay();
    let obsDate = fixedDate;
    if (dow === 0) {
      // Sunday -> Monday
      obsDate = new Date(Date.UTC(fixedDate.getUTCFullYear(), fixedDate.getUTCMonth(), fixedDate.getUTCDate() + 1));
    } else if (dow === 6) {
      // Saturday -> Friday
      obsDate = new Date(Date.UTC(fixedDate.getUTCFullYear(), fixedDate.getUTCMonth(), fixedDate.getUTCDate() - 1));
    }
    holidays.push({
      name,
      date: obsDate.toISOString().slice(0, 10),
    });
  };

  // 1. New Year's Day (Jan 1)
  addObserved("New Year's Day", new Date(Date.UTC(calYear, 0, 1)));

  // 2. Martin Luther King Jr. Day (3rd Monday in January)
  const mlk = getNthWeekdayOfMonth(calYear, 0, 1, 3);
  if (mlk) holidays.push({ name: 'Martin Luther King Jr. Day', date: mlk.toISOString().slice(0, 10) });

  // 3. Memorial Day (Last Monday in May)
  const mem = getLastWeekdayOfMonth(calYear, 4, 1);
  if (mem) holidays.push({ name: 'Memorial Day', date: mem.toISOString().slice(0, 10) });

  // 4. Juneteenth (June 19, federal / standard since 2021)
  if (calYear >= 2021) {
    addObserved('Juneteenth National Independence Day', new Date(Date.UTC(calYear, 5, 19)));
  }

  // 5. Independence Day (July 4)
  addObserved('Independence Day (4th of July)', new Date(Date.UTC(calYear, 6, 4)));

  // 6. Labor Day (1st Monday in September)
  const lab = getNthWeekdayOfMonth(calYear, 8, 1, 1);
  if (lab) holidays.push({ name: 'Labor Day', date: lab.toISOString().slice(0, 10) });

  // 7. Thanksgiving Day (4th Thursday in November)
  const thx = getNthWeekdayOfMonth(calYear, 10, 4, 4);
  if (thx) {
    holidays.push({ name: 'Thanksgiving Day', date: thx.toISOString().slice(0, 10) });
    // 8. Day After Thanksgiving (Friday) - standard commercial/casket logistics closure
    const dayAfter = new Date(Date.UTC(calYear, 10, thx.getUTCDate() + 1));
    holidays.push({ name: 'Day After Thanksgiving', date: dayAfter.toISOString().slice(0, 10) });
  }

  // 9. Christmas Day (December 25)
  addObserved('Christmas Day', new Date(Date.UTC(calYear, 11, 25)));

  return holidays;
}

/**
 * Calculates exact billing days for a specific month and year excluding weekends & corporate holidays.
 */
export function calculateBillingDaysForMonth(calYear: number, calMonth1: number): {
  totalDays: number;
  weekendDays: number;
  holidayDays: number;
  billingDays: number;
  holidays: HolidayDetail[];
} {
  const calMonth0 = calMonth1 - 1; // 0-indexed
  // Get holidays for this year plus adjacent years (to catch New Year's on Saturday Jan 1 observed Dec 31)
  const allHolidays = [
    ...getCorporateHolidaysForYear(calYear - 1),
    ...getCorporateHolidaysForYear(calYear),
    ...getCorporateHolidaysForYear(calYear + 1),
  ];

  const monthHolidayMap = new Map<string, string>();
  for (const h of allHolidays) {
    const [hYear, hMonth] = h.date.split('-').map(Number);
    if (hYear === calYear && hMonth === calMonth1) {
      monthHolidayMap.set(h.date, h.name);
    }
  }

  let totalDays = 0;
  let weekendDays = 0;
  let holidayDays = 0;
  let billingDays = 0;
  const holidaysFound: HolidayDetail[] = [];

  for (let day = 1; day <= 31; day++) {
    const d = new Date(Date.UTC(calYear, calMonth0, day));
    if (d.getUTCMonth() !== calMonth0) break;

    totalDays++;
    const dow = d.getUTCDay();
    const dateStr = d.toISOString().slice(0, 10);

    if (dow === 0 || dow === 6) {
      weekendDays++;
    } else if (monthHolidayMap.has(dateStr)) {
      holidayDays++;
      holidaysFound.push({
        name: monthHolidayMap.get(dateStr)!,
        date: dateStr,
      });
    } else {
      billingDays++;
    }
  }

  return {
    totalDays,
    weekendDays,
    holidayDays,
    billingDays,
    holidays: holidaysFound,
  };
}

/**
 * Calculates all 12 fiscal months of billing days for any Batesville Fiscal Year (Oct 1 – Sep 30)
 * e.g. for '2024-25', October is in 2024, January is in 2025.
 */
export function getFiscalYearBillingDays(fiscalYearStr: string): MonthBillingInfo[] {
  let baseYear = 2024;
  if (fiscalYearStr.includes('-')) {
    baseYear = parseInt(fiscalYearStr.split('-')[0], 10);
  } else if (!isNaN(parseInt(fiscalYearStr, 10))) {
    baseYear = parseInt(fiscalYearStr, 10);
  }

  const fiscalMonthDefs = [
    { fiscalMonth: 1,  monthCode: 'OCT', monthName: 'Oct', calMonth: 10, calYear: baseYear },
    { fiscalMonth: 2,  monthCode: 'NOV', monthName: 'Nov', calMonth: 11, calYear: baseYear },
    { fiscalMonth: 3,  monthCode: 'DEC', monthName: 'Dec', calMonth: 12, calYear: baseYear },
    { fiscalMonth: 4,  monthCode: 'JAN', monthName: 'Jan', calMonth: 1,  calYear: baseYear + 1 },
    { fiscalMonth: 5,  monthCode: 'FEB', monthName: 'Feb', calMonth: 2,  calYear: baseYear + 1 },
    { fiscalMonth: 6,  monthCode: 'MAR', monthName: 'Mar', calMonth: 3,  calYear: baseYear + 1 },
    { fiscalMonth: 7,  monthCode: 'APR', monthName: 'Apr', calMonth: 4,  calYear: baseYear + 1 },
    { fiscalMonth: 8,  monthCode: 'MAY', monthName: 'May', calMonth: 5,  calYear: baseYear + 1 },
    { fiscalMonth: 9,  monthCode: 'JUN', monthName: 'Jun', calMonth: 6,  calYear: baseYear + 1 },
    { fiscalMonth: 10, monthCode: 'JUL', monthName: 'Jul', calMonth: 7,  calYear: baseYear + 1 },
    { fiscalMonth: 11, monthCode: 'AUG', monthName: 'Aug', calMonth: 8,  calYear: baseYear + 1 },
    { fiscalMonth: 12, monthCode: 'SEP', monthName: 'Sep', calMonth: 9,  calYear: baseYear + 1 },
  ];

  return fiscalMonthDefs.map((def) => {
    const calc = calculateBillingDaysForMonth(def.calYear, def.calMonth);
    return {
      fiscalMonth: def.fiscalMonth,
      monthCode: def.monthCode,
      monthName: def.monthName,
      calYear: def.calYear,
      calMonth: def.calMonth,
      totalDays: calc.totalDays,
      weekendDays: calc.weekendDays,
      holidayDays: calc.holidayDays,
      billingDays: calc.billingDays,
      holidays: calc.holidays,
    };
  });
}
