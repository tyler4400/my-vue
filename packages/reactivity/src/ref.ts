import { activeSub } from './effect'

enum ReactiveFlags {
  IS_REF = '__v_isRef',
}

class RefImpl {
  // ref 标记，证明是一个 ref
  public readonly [ReactiveFlags.IS_REF] = true

  // 保存实际的值
  _value

  // 保存和 effect 之间的关联关系
  subs

  constructor(value) {
    this._value = value
  }

  get value() {
    // 收集依赖
    if (activeSub) {
      console.log('我在effect中被读取了， 将整个函数收集起来')
      // 如果 activeSub 有，那就保存起来，等我更新的时候，触发
      this.subs = activeSub
    } else {
      console.log('不在effect中， 不会收集依赖')
    }
    return this._value
  }

  set value(newVal) {
    console.log('我被设置新值了， 通知依赖重新执行')
    this._value = newVal

    // 通知effect重新执行
    this.subs?.()
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
