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

class ReactiveEffect {
  // 控制创建的effect是否是响应式的
  public active = true

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
