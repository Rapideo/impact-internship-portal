export interface FieldError {
  field: string;
  message: string;
}

export type Validator<T> = (raw: string, fieldName: string) => { value: T } | { error: string };

/**
 * Parse a FormData against a schema of per-field validators.
 * Returns the parsed values (typed) and a list of field errors.
 *
 * Behaviour: every validator runs, so a form submission produces ALL
 * relevant inline errors at once.
 */
export function parseFormFields<S extends Record<string, Validator<unknown>>>(
  formData: FormData,
  schema: S,
): {
  values: { [K in keyof S]: S[K] extends Validator<infer T> ? T : never };
  errors: FieldError[];
} {
  const values = {} as { [K in keyof S]: unknown };
  const errors: FieldError[] = [];
  for (const key in schema) {
    const validator = schema[key]!;
    const raw = String(formData.get(key) ?? '');
    const out = validator(raw, key);
    if ('error' in out) {
      values[key] = null;
      errors.push({ field: key, message: out.error });
    } else {
      values[key] = out.value;
    }
  }
  return { values: values as never, errors };
}

export function requireString(label: string): Validator<string> {
  return (raw) => {
    const v = raw.trim();
    if (!v) return { error: `${label} is required.` };
    return { value: v };
  };
}

export function optionalString(_label: string): Validator<string | null> {
  return (raw) => {
    const v = raw.trim();
    return { value: v === '' ? null : v };
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requireEmail(label: string): Validator<string> {
  return (raw) => {
    const v = raw.trim();
    if (!v) return { error: `${label} is required.` };
    if (!EMAIL_RE.test(v)) return { error: `${label} must be a valid email.` };
    return { value: v };
  };
}

export function optionalEmail(label: string): Validator<string | null> {
  return (raw) => {
    const v = raw.trim();
    if (v === '') return { value: null };
    if (!EMAIL_RE.test(v)) return { error: `${label} must be a valid email.` };
    return { value: v };
  };
}

export function requirePositiveInt(label: string): Validator<number> {
  return (raw) => {
    const v = raw.trim();
    if (!v) return { error: `${label} is required.` };
    const n = Number(v);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
      return { error: `${label} must be a positive integer.` };
    }
    return { value: n };
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function requireDate(label: string): Validator<string> {
  return (raw) => {
    const v = raw.trim();
    if (!v) return { error: `${label} is required.` };
    if (!DATE_RE.test(v)) return { error: `${label} must be a date.` };
    return { value: v };
  };
}

export function optionalDate(label: string): Validator<string | null> {
  return (raw) => {
    const v = raw.trim();
    if (v === '') return { value: null };
    if (!DATE_RE.test(v)) return { error: `${label} must be a date.` };
    return { value: v };
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireUuid(label: string): Validator<string> {
  return (raw) => {
    const v = raw.trim();
    if (!v) return { error: `${label} is required.` };
    if (!UUID_RE.test(v)) return { error: `${label} is not a valid id.` };
    return { value: v };
  };
}

export function optionalUuid(label: string): Validator<string | null> {
  return (raw) => {
    const v = raw.trim();
    if (v === '') return { value: null };
    if (!UUID_RE.test(v)) return { error: `${label} is not a valid id.` };
    return { value: v };
  };
}

export function requireSingleCharUpper(label: string): Validator<string> {
  return (raw) => {
    const v = raw.trim();
    if (!v) return { error: `${label} is required.` };
    if (!/^[A-Za-z]$/.test(v)) return { error: `${label} must be one letter.` };
    return { value: v.toUpperCase() };
  };
}

/**
 * Convenience: return errors as a Record<string, string> for easy
 * field-level lookup in components.
 */
export function errorsByField(errors: FieldError[]): Record<string, string> {
  return Object.fromEntries(errors.map((e) => [e.field, e.message]));
}
