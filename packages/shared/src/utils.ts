export function isObject(value: unknown) {
  return typeof value === 'object' && value !== null
}

export function isFunction(value) {
  return typeof value === 'function'
}

export function isString(value) {
  return typeof value === 'string'
}

export function isArray(value) {
  return Array.isArray(value)
}
