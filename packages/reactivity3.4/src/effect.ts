import { DepMap } from './types'

/**
 * 副作用函数
 *
 * 就是当依赖的变量变化时，会自动重新执行原函数
 * @param fn 重新执行的函数
 * @param options
 */
export function effect(fn: Function, options?: any) {
  const _effect = new ReactiveEffect(fn, () => _effect.run())

  // 默认执行一次
  _effect.run()

  return _effect
}

export let activeEffect: ReactiveEffect

export class ReactiveEffect {
  // 控制创建的effect是否是响应式的
  public active = true

  // 用于记录当前effect执行了几次
  public _trackId = 0

  // 第几个依赖是谁？
  public _depsLength: number = 0

  // 记录当前effect， 被那些dep对象依赖， 双向关联
  public deps: DepMap[] = []

  constructor(
    public fn: Function,
    public scheduler?: any,
  ) {}

  run() {
    // 不是激活的，执行后，什么都不用做 不用做额外的处理
    if (!this.active) return this.fn()

    const lastEffect = activeEffect
    try {
      activeEffect = this
      return this.fn()
    } finally {
      activeEffect = lastEffect
    }
  }

  stop() {
    this.active = false
  }
}

// effect和dep双向关联
export const trackEffect = (effect: ReactiveEffect, dep: DepMap) => {
  dep.set(effect, effect._trackId)
  effect.deps[effect._depsLength++] = dep
}

export const triggerEffects = (dep: DepMap) => {
  for (const effect of dep.keys()) {
    if (effect.scheduler) {
      effect.scheduler()
    }
  }
}
