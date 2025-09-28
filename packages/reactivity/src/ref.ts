import { activeSub } from './effect'
import { linkEffectToSubscription, Link, propagate } from './system'

enum ReactiveFlags {
  IS_REF = '__v_isRef',
}

export class RefImpl {
  // ref 标记，证明是一个 ref
  public readonly [ReactiveFlags.IS_REF] = true

  // 保存实际的值
  _value

  /**
   * 双向链表的头链表， 收集依赖
   */
  headSubs: Link

  /**
   * 双向链表的tail链表， 收集依赖
   */
  tailSubs: Link

  constructor(value) {
    this._value = value
  }

  get value() {
    // 收集依赖
    trackRef(this)
    return this._value
  }

  set value(newVal) {
    this._value = newVal

    // 通知effect重新执行
    triggerRef(this)
  }
}

export function trackRef(dep: RefImpl) {
  if (activeSub) {
    // 如果 activeSub 有，那就保存起来，等我更新的时候，触发
    linkEffectToSubscription(dep, activeSub)
  }
}

export function triggerRef(dep: RefImpl) {
  if (dep.headSubs) {
    propagate(dep.headSubs)
  }
}

export function ref(value) {
  return new RefImpl(value)
}

/**
 * 判断是不是一个 ref
 * @param value
 */
export function isRef(value) {
  return !!(value && value[ReactiveFlags.IS_REF])
}
