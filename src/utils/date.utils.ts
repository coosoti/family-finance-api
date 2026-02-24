export function getCurrentMonth(): string {
  const now = new Date();
  return formatMonthString(now);
}

export function formatMonthString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getMonthsBetween(
  startMonth: string,
  endMonth: string
): string[] {
  const months: string[] = [];
  const [startYear, startMonthNum] = startMonth.split('-').map(Number);
  const [endYear, endMonthNum] = endMonth.split('-').map(Number);

  let currentYear = startYear;
  let currentMonth = startMonthNum;

  while (
    currentYear < endYear ||
    (currentYear === endYear && currentMonth <= endMonthNum)
  ) {
    months.push(
      `${currentYear}-${String(currentMonth).padStart(2, '0')}`
    );

    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }

  return months;
}

export function isValidMonth(month: string): boolean {
  const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
  return monthRegex.test(month);
}

export function isValidDateRange(
  startMonth: string,
  endMonth: string
): boolean {
  if (!isValidMonth(startMonth) || !isValidMonth(endMonth)) {
    return false;
  }
  return startMonth <= endMonth;
}