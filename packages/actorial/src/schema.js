// Tiny schema builder that emits JSON Schema. Zod-like surface, zero deps.

const mk = (schema) => ({
  ...schema,
  optional() { return { ...this, __optional: true }; },
  default(v) { return { ...this, __default: v, __optional: true }; },
  describe(d) { return { ...this, description: d }; },
});

export const s = {
  string: () => mk({ type: "string" }),
  number: () => mk({ type: "number" }),
  integer: () => mk({ type: "integer" }),
  boolean: () => mk({ type: "boolean" }),
  enum: (values) => mk({ type: "string", enum: values }),
  array: (item) => mk({ type: "array", items: strip(item) }),
  object: (props) => {
    const properties = {};
    const required = [];
    for (const [k, v] of Object.entries(props)) {
      properties[k] = strip(v);
      if (!v.__optional) required.push(k);
    }
    return mk({ type: "object", properties, required, additionalProperties: false });
  },
};

function strip(v) {
  const { optional, default: _d, describe, __optional, __default, ...rest } = v;
  if (__default !== undefined) rest.default = __default;
  return rest;
}

export function toJsonSchema(v) {
  return strip(v);
}

// Minimal validator: enough for the shapes above.
export function validate(schema, value, path = "$") {
  const errors = [];
  const t = schema.type;
  if (t === "object") {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return [`${path}: expected object`];
    }
    for (const req of schema.required || []) {
      if (value[req] === undefined) errors.push(`${path}.${req}: required`);
    }
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      const sub = schema.properties?.[k];
      if (!sub) { errors.push(`${path}.${k}: unknown field`); continue; }
      errors.push(...validate(sub, v, `${path}.${k}`));
    }
    return errors;
  }
  if (t === "array") {
    if (!Array.isArray(value)) return [`${path}: expected array`];
    value.forEach((it, i) => errors.push(...validate(schema.items, it, `${path}[${i}]`)));
    return errors;
  }
  if (t === "string") {
    if (typeof value !== "string") return [`${path}: expected string`];
    if (schema.enum && !schema.enum.includes(value)) return [`${path}: must be one of ${schema.enum.join(", ")}`];
    return [];
  }
  if (t === "number" || t === "integer") {
    if (typeof value !== "number") return [`${path}: expected number`];
    if (t === "integer" && !Number.isInteger(value)) return [`${path}: expected integer`];
    return [];
  }
  if (t === "boolean") {
    if (typeof value !== "boolean") return [`${path}: expected boolean`];
    return [];
  }
  return [];
}

export function applyDefaults(schema, value) {
  if (schema.type !== "object" || typeof value !== "object" || value === null) return value;
  const out = { ...value };
  for (const [k, sub] of Object.entries(schema.properties || {})) {
    if (out[k] === undefined && sub.default !== undefined) out[k] = sub.default;
  }
  return out;
}
