export type RecordValue = Record<string, unknown>;

export const isRecord = (value: unknown): value is RecordValue =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const isShortString = (value: unknown, maxLength = 2_000): value is string =>
  typeof value === "string" && value.length <= maxLength;

export const isOptionalShortString = (value: unknown) =>
  value === undefined || isShortString(value);
