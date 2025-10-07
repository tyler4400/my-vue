import { ComputedGetter, ComputedSetter, DepMap, WritableComputedOptions } from './types'
import { isFunction } from '@vue/shared'
import { ReactiveEffect } from './effect'
import { trackRefValue, triggerRefValue } from '@vue/reactivity3.4'

/**
 * 描述实现原理:
 * 1. computed本质是一个effect，会多用到一个dirty属性
 * 2. getter函数（fn)执行的时候，我们不直接让fn重新执行，而是多绕一层
 * 3. 先让自己保存的dep（也就是computed.value收集的依赖)触发trigger
 * 4. trigger会让computed.value所处于的fn执行
 * 5. computed.value所处在的fn执行的时候，读取computed.value的时候会触发ComputedRefImp类的get value
 * 6. ComputedRefImp类的get value执行时，会让this.effect.run()执行（也就是getter方法）
 *
 * 流程图
 * ref收集依赖流程：effect.fn() -> ref.value(get) -> trackEffect
 * ref触发依赖流程：ref.value(set) -> triggerEffects -> effect.fn()
 *
 * 而computed多绕了一层
 * computed依赖收集流程: 外部fn读取computed.value -> this.effect.run()(dirty=false) -> getter执行 -> getter内部的响应式变量收集this.effect
 * computed依赖触发流程: getter内部响应式变量变化 -> triggerEffects(dirty=true) -> 外部fn执行 ···-> 轮回
 *
 * 而如果dirty=false的时候: 外部fn读取computed.value -> this.effect.run()就不用执行，也就是达到了缓存的目的
 *
 */
export class ComputedRefImp<T> {
  /**
   * 缓存的值。
   * @private
   */
  private _value?: T

  /**
   * effect是一个link的桥梁
   * 利用这个effect来实现当外部读取computed.value的时候，触发getter的执行
   * 以及getter内部响应式变量变化时， 触发外部包裹computed.value的fn执行
   */
  private effect: ReactiveEffect

  /**
   * 收集外部函数fn对此computed.value的依赖
   */
  public dep: DepMap

  constructor(
    getter: ComputedGetter<T>,
    private readonly setter: ComputedSetter<T>,
  ) {
    this.effect = new ReactiveEffect(
      () => getter(this._value),
      () => {
        /**
         * 当getter函数（也就是fn）里的响应式变量变化时。会触发此scheduler函数的执行
         * 这个scheduler函数的内容是触发trigger执行，也就是triggerEffects执行
         * triggerEffects执行的时候会将effect的dirty设置为true
         * effect执行fn，执行一次的时候又会把effect的dirty设置为false，这样也就是只有getter函数内部的响应式变量变化的时候才会走这个流程
         */
        triggerRefValue(this)
      },
    )
  }

  get value() {
    if (this.effect.dirty) {
      // 默认取值一定是脏的, 但是执行一次run后就不脏了
      this._value = this.effect.run()
    }
    /**
     * 收集effect中 computed.value
     */
    trackRefValue(this)
    return this._value
  }

  set value(value: T) {
    this.setter(value)
  }
}

export function computed<T>(getter: ComputedGetter<T>)
export function computed<T>(options: WritableComputedOptions<T>)
export function computed<T>(getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>) {
  let getter: ComputedGetter<T>
  let setter: ComputedSetter<T>

  const onlyGetter = isFunction(getterOrOptions)
  if (onlyGetter) {
    getter = getterOrOptions as ComputedGetter<T>
    setter = () => console.warn('computed value must be readonly')
  } else {
    getter = (getterOrOptions as WritableComputedOptions<T>).get
    setter = (getterOrOptions as WritableComputedOptions<T>).set
  }
  return new ComputedRefImp(getter, setter)
}
