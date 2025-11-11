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

// 字符串缓存函数 - 提升性能，避免重复计算相同字符串的转换结果
const cacheStringFunction = (fn: (str: string) => string) => {
  const cache = Object.create(null)
  return (str: string): string => {
    const hit = cache[str]
    return hit || (cache[str] = fn(str))
  }
}

// kebab-case 转 camelCase 的正则表达式
const camelizeRE = /-(\w)/g

/**
 * 将 kebab-case 字符串转换为 camelCase
 * 例如: 'my-prop' -> 'myProp'
 */
export const camelize = cacheStringFunction(str => {
  return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''))
})

// camelCase 转 kebab-case 的正则表达式
const hyphenateRE = /\B([A-Z])/g
/**
 * 将 camelCase 字符串转换为 kebab-case
 * 例如: 'myProp' -> 'my-prop'
 */
export const hyphenate = cacheStringFunction(str => str.replace(hyphenateRE, '-$1').toLowerCase())

/**
 * 将字符串首字母大写
 * 例如: 'myProp' -> 'MyProp'
 */
export const capitalize = cacheStringFunction(str => {
  return str.charAt(0).toUpperCase() + str.slice(1)
})

/**
 * 将事件名转换为处理器key格式 (加上 'on' 前缀并首字母大写)
 * 例如: 'click' -> 'onClick', 'my-event' -> 'onMyEvent'
 */
export const toHandlerKey = cacheStringFunction(str => {
  const s = str ? `on${capitalize(camelize(str))}` : ''
  return s
})
