import { track, trigger } from './reactiveEffect'
import { isObject } from '@vue/shared'
import { reactive } from '@vue/reactivity3.4'

export enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive', // 可以使用symbol
}

export const mutableHandlers: ProxyHandler<object> = {
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) return true

    // 依赖收集
    track(target, key)

    const res = Reflect.get(target, key, receiver)
    if (isObject(res)) {
      // 当取的值也是对象的时候,需要对这个对象进行代理,递归代理
      return reactive(res)
    }
    return res
  },
  set(target, key, value, receiver) {
    // 触发更新

    const oldVal = target[key]

    const result = Reflect.set(target, key, value, receiver)
    if (oldVal !== value) {
      trigger(target, key, value, oldVal)
    }
    return result
  },
}
