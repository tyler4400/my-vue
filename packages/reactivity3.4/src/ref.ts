import { toReactive } from './reactive'
import { createDep } from './reactiveEffect'
import { activeEffect, trackEffect, triggerEffects } from './effect'
import { DepMap, ObJKey } from './types'

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

class ObjectRefImpl {
  __v_isRef = true
  constructor(
    public _object: object,
    public _key: ObJKey,
  ) {}

  get value() {
    return this._object[this._key]
  }

  set value(newValue: any) {
    this._object[this._key] = newValue
  }
}

/**
 * 判断一个值是否为 ref。
 *
 * 判定依据：对象上是否存在内部标记 `__v_isRef`。
 *
 * 使用场景：
 * - 运行时做类型分支：如果是 ref 则读写 `.value`，否则按原值处理。
 *
 * 示例：
 * ```ts
 * import { isRef, ref } from '@reactivity3.4'
 * const count = ref(0)
 * console.log(isRef(count)) // true
 * console.log(isRef(1))     // false
 * ```
 */
export function isRef(value) {
  return !!(value && value['__v_isRef'])
}

/**
 * 创建一个可响应的 ref。
 *
 * - 对象类型会通过 `toReactive` 自动包裹为 `reactive`，从而保持深层响应。
 * - 基本类型直接存储原值。
 *
 * 示例：
 * ```ts
 * import { ref, effect } from '@reactivity3.4'
 * const n = ref(1)
 * effect(() => {
 *   console.log('n ->', n.value)
 * })
 * n.value++ // 触发 effect 重新执行
 *
 * const state = ref({ name: 'jack' })
 * effect(() => {
 *   console.log('name ->', state.value.name)
 * })
 * state.value.name = 'rose' // 触发 effect
 * ```
 */
export function ref(value: any) {
  return createRef(value)
}

/**
 * 将对象的单个属性“按引用”转为 ref。
 *
 * - 若 `obj` 是 reactive：读取 `r.value` 会间接读取 `obj[key]`，因此能被依赖收集；
 *   写入 `r.value = x` 等同于 `obj[key] = x`，可触发响应。
 * - 若 `obj` 是普通对象：只做“按引用”的桥接，不具备响应能力。
 *
 * 典型用途：避免解构时丢失响应（单属性场景）。
 *
 * 示例：
 * ```ts
 * import { reactive, toRef, effect } from '@reactivity3.4'
 * const state = reactive({ name: 'jack', age: 18 })
 * const nameRef = toRef(state, 'name')
 * effect(() => console.log('name:', nameRef.value))
 * state.name = 'rose'   // 触发
 * nameRef.value = 'tom' // 等同于 state.name = 'tom'，也会触发
 * ```
 */
export function toRef(obj: object, key: ObJKey) {
  return new ObjectRefImpl(obj, key)
}

/**
 * 将对象的所有属性批量转换为“按引用”的 ref 映射。
 *
 * - 常用于解构时保留响应：`const { a, b } = toRefs(state)`。
 * - 若传入普通对象，仅提供“桥接访问”，不具备响应。
 * - 这里未特殊处理数组场景（与 Vue 保持简单实现一致）。
 *
 * 示例：
 * ```ts
 * import { reactive, toRefs, effect } from '@reactivity3.4'
 * const state = reactive({ a: 1, b: 2 })
 * const { a, b } = toRefs(state)
 * effect(() => console.log(a.value, b.value))
 * a.value++ // 等同于 state.a++，会触发
 * ```
 */
export function toRefs(obj: object): Record<ObJKey, ObjectRefImpl> {
  // 不考虑obj是数组的情况
  const res = {}
  for (const key in obj) {
    res[key] = toRef(obj, key)
  }
  return res
}

/**
 * 对包含 ref 的对象进行“取值解包 + 赋值透传”的代理包装。
 *
 * - 读取：若属性值是 ref，返回其 `.value`；否则返回原值。
 * - 写入：若旧值是 ref，写入会落到 `.value` 上；否则按普通属性赋值。
 *
 * 典型用途：在“模板/视图层风格”的使用中，直接以属性形式读写，而无需显式 `.value`。
 *
 * 示例：
 * ```ts
 * import { ref, proxyRefs, effect } from '@reactivity3.4'
 * const user = proxyRefs({ name: ref('jack'), age: ref(18) })
 * effect(() => console.log(user.name, user.age)) // 自动解包，无需 .value
 * user.name = 'rose' // 等价 user.nameRef.value = 'rose'
 * user.age++         // 等价 user.ageRef.value++
 * ```
 */
export function proxyRefs(objectWithRef: Record<ObJKey, ObjectRefImpl>) {
  return new Proxy(objectWithRef, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver)
      return res?.__v_isRef ? res.value : res
    },
    set(target, key, value, receiver) {
      const oldValue = target[key]
      if (oldValue.__v_isRef) {
        oldValue.value = value
        return true
      } else {
        return Reflect.set(target, key, value, receiver)
      }
    },
  })
}
