/**
 * Money helper matching the backend's `BigDecimal.setScale(2, RoundingMode.HALF_UP)` behaviour
 * closely enough for a personal ledger app. All stored amounts are plain JS numbers rounded to
 * 2 decimal places using half-up rounding (not the "round half to even" that Math.round can drift
 * into with floating point, and not banker's rounding).
 */
export function scale2(value: number | null | undefined): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  // Round to 2dp, half-up, guarding against classic floating point artifacts (e.g. 1.005 -> 1.00).
  const sign = value < 0 ? -1 : 1;
  const rounded = Math.round((Math.abs(value) + Number.EPSILON) * 100) / 100;
  return sign * rounded;
}

export function addMoney(a: number, b: number): number {
  return scale2(scale2(a) + scale2(b));
}

export function subMoney(a: number, b: number): number {
  return scale2(scale2(a) - scale2(b));
}

export function sumMoney(values: (number | null | undefined)[]): number {
  return scale2(values.reduce<number>((acc, v) => acc + (v ?? 0), 0));
}
