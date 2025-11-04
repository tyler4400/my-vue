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

export const hasOwn = (() => {
  if (isFunction(Object.hasOwn)) {
    return (value: any, key: PropertyKey) => (value === null || value === undefined ? false : Object.hasOwn(value, key))
  } else {
    return (value: any, key: PropertyKey) =>
      value === null || value === undefined ? false : Object.prototype.hasOwnProperty.call(value, key)
  }
})()
