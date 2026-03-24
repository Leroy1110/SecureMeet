export type JsonRecord = Record<string, unknown>;

export const isJsonRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const readString = (value: unknown): string => (typeof value === "string" ? value : "");

export const pickString = (record: JsonRecord, keys: string[]): string => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return "";
};

export const parsePositiveInteger = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);
    if (Number.isInteger(parsedValue) && parsedValue > 0) {
      return parsedValue;
    }
  }

  return null;
};

export const parseNullableInteger = (value: unknown): number | null => {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  return parsePositiveInteger(value);
};

export const extractUserLabel = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (!isJsonRecord(value)) {
    return "";
  }

  return pickString(value, ["username", "user_id", "id", "name"]);
};

export const extractUserList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const users = value
    .map((item) => extractUserLabel(item))
    .filter((item) => Boolean(item.trim()));

  return Array.from(new Set(users));
};
