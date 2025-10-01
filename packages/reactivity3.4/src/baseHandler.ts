import { track, trigger } from './reactiveEffect'

export enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive', // 可以使用symbol
}

export const mutableHandlers: ProxyHandler<object> = {
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) return true

    // 依赖收集 todo 应该让响应式属性 和 effect 映射起来
    track(target, key)

    return Reflect.get(target, key, receiver)
  },
  set(target, key, value, receiver) {
    // 触发更新 todo 找到属性 让对应的effect重新执行

    const oldVal = target[key]

    const result = Reflect.set(target, key, value, receiver)
    if (oldVal !== value) {
      trigger(target, key, value, oldVal)
    }
    return result
  },
}
