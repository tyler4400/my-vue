import { toReactive } from './reactive'
import { createDep } from './reactiveEffect'
import { activeEffect, trackEffect, triggerEffects } from './effect'
import { DepMap } from './types'

export function ref(value: any) {
  return createRef(value)
}

function createRef(value: any) {
  return new RefImpl(value)
}

class RefImpl {
  __v_isRef = true

  private _value: any

  constructor(public RawValue: any) {
    this._value = toReactive(RawValue)
  }

  /**
   * 收集依赖
   */
  public dep: DepMap

  get value() {
    trackRefValue(this)
    return this._value
  }

  set value(newValue: any) {
    if (newValue !== this.RawValue) {
      this.RawValue = newValue
      this._value = newValue
      triggerRefValue(this)
    }
  }
}

function trackRefValue(ref: RefImpl) {
  if (activeEffect) {
    //这里的“两个问号”是空值合并赋值运算符 ??=。它表示：仅当左侧为 null 或 undefined 时，才把右侧的值赋给左侧
    ref.dep ??= createDep(() => (ref.dep = undefined))
    trackEffect(activeEffect, ref.dep)
  }
}

function triggerRefValue(ref: RefImpl) {
  const dep = ref.dep
  if (dep) triggerEffects(dep)
}

/**
 * 判断是不是一个 ref
 * @param value
 */
export function isRef(value) {
  return !!(value && value['__v_isRef'])
}
