import { activeSub } from './effect'
import { link, Link } from './system'

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
  headSubscription: Link

  /**
   * 双向链表的tail链表， 收集依赖
   */
  tailSubscription: Link

  constructor(value) {
    this._value = value
  }

  get value() {
    // 收集依赖
    if (activeSub) {
      console.log('我在effect中被读取了， 将整个函数收集起来.')
      // 如果 activeSub 有，那就保存起来，等我更新的时候，触发
      link(this, activeSub)
    } else {
      console.log('不在effect中， 不会收集依赖')
    }
    return this._value
  }

  set value(newVal) {
    console.log('我被设置新值了， 通知依赖重新执行')
    this._value = newVal

    // 通知effect重新执行
    const queueEffect: Function[] = []
    let pointer = this.headSubscription
    while (pointer) {
      queueEffect.push(pointer.sub)
      pointer = pointer.nextSub
    }
    for (const effect of queueEffect) {
      effect()
    }
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
