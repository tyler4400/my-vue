import { isObject } from '@vue/shared'
import { mutableHandlers } from './baseHandler'
import { ReactiveFlags } from './constants'

/**
 * weakMap的key是原对象target，value是代理的proxy
 */
const reactiveMap = new WeakMap()

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

export function reactive(target: object) {
  return createReactiveObject(target)
}

export function toReactive(value: any) {
  return isObject(value) ? reactive(value) : value
}
