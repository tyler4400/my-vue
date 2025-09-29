import { isObject } from '@vue/shared'

enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive', // 可以使用symbol
}
/**
 * weakMap的key是原对象target，value是代理的proxy
 */
const reactiveMap = new WeakMap()

const mutableHandlers: ProxyHandler<object> = {
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) return true
    console.log('get handler', target, key, receiver)
    return target[key]
  },
  set(target, key, value, receiver) {
    console.log('set handler', target, key, value, receiver)
    return true
  },
}

export function reactive(target: object) {
  return createReactiveObject(target)
}

function createReactiveObject(target: object) {
  // 统一判断，响应式对象target必须是对象
  if (!isObject(target)) return target

  // 如果有isReactive属性，说明已经是响应式的对象
  if (target[ReactiveFlags.IS_REACTIVE]) return target

  // 如果已经代理过了，就直接去缓存结果
  const existsProxy = reactiveMap.get(target)
  if (existsProxy) return existsProxy

  const proxy = new Proxy(target, mutableHandlers)
  reactiveMap.set(target, proxy)
  return proxy
}
