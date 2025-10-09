import { isRef, RefImpl } from './ref'
import { ComputedRefImp } from './computed'
import { isArray, isFunction, isObject } from '@vue/shared'
import { ReactiveEffect } from './effect'
import { isReactive } from './reactive'

/**
 * source官方支持下面这些类型， 但我们这里不支持数组
 * 一个函数，返回一个值， 一个 ref，一个响应式对象，或是由以上类型的值组成的数组
 */
export type WatchSource = RefImpl | ComputedRefImp<any> | Function

export type WatchCallback<V = any, OV = any> = (
  value: V,
  oldValue: OV,
  // onCleanup: OnCleanup,
) => any

/**
 * 相比于官方，我们的仅支持deep,immediate
 */
export interface WatchOptions {
  deep?: false | number
  immediate?: boolean
}

/**
 * watch的原理其实很简单，就是利用new了一个ReactiveEffect
 * 把source封装成fn作为第一个参数，cb是第一个。
 * 所以当source中有响应式对象时，就会触发cb
 * @param source
 * @param cb
 * @param options
 */
export function watch(source: WatchSource, cb: WatchCallback, options: WatchOptions = {}) {
  return doWatch(source, cb, options)
}

export type WatchEffect = () => void

/**
 * 本质上就是一个Effect
 * @param effect
 */
export function watchEffect(effect: WatchEffect) {
  // 没有cb 就是watchEffect
  return doWatch(effect)
}

export function doWatch(source: WatchSource, cb: WatchCallback = null, { deep, immediate }: WatchOptions = {}) {
  // 产生一个可以给ReactiveEffect来使用的getter，需要对这个对象进行取值操作，会关联当前的reactiveEffect
  const reactiveGetter = (_source: object) => traverse(_source, deep === false ? 0 : deep)
  let getter: Function
  if (isReactive(source)) {
    getter = () => reactiveGetter(source)
  } else if (isRef(source)) {
    getter = () => (source as RefImpl).value
  } else if (isFunction(source)) {
    getter = source as Function
  }

  let oldValue: any
  let newValue: any

  const job = () => {
    if (isFunction(cb)) {
      newValue = effect.run()
      cb(newValue, oldValue)
      oldValue = newValue
    } else {
      effect.run()
    }
  }
  const effect = new ReactiveEffect(getter, job)

  if (isFunction(cb)) {
    if (immediate) {
      job()
    } else {
      oldValue = effect.run()
    }
  } else {
    // cb 不存在，那就算watchEffect的场景
    effect.run()
  }
}

/**
 * traverse方法的唯一作用就是遍历source的每个属性的get.(并不做任何事情)
 * 这样就会被响应式系统收集到
 * @param source
 * @param depth
 * @param currentDepth
 * @param visited
 */
function traverse(source: any, depth?: number, currentDepth = 0, visited = new Set()) {
  if (!isObject(source)) return source
  if (visited.has(source)) return source
  visited.add(source)

  /**
   * todo 实际上这里读取了length仍然不会触发数组的响应式,我们的依赖收集系统没写好。需要在baseHandler中再增加对数组的拦截
   */
  if (isArray(source)) {
    // 订阅 push/pop/length 变化
    void source.length
  }

  // 永远读取“当前层”的属性，保证边界层也能被收集
  for (const key in source) {
    const value = source[key] // 读取当前层属性以收集依赖
    // 仅在未达到深度上限时，继续深入
    if (depth === undefined || currentDepth < depth) {
      traverse(value, depth, currentDepth + 1, visited)
    }
  }
  return source
}
