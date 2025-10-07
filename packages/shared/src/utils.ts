export function isObject(value: unknown) {
  return typeof value === 'object' && value !== null
}

export function isFunction(value) {
  return typeof value === 'function'
}

export function isArray(value) {
  return Array.isArray(value)
}
