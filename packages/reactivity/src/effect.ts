// 用来保存当前正在执行的 effect
export let activeSub: ReactiveEffect

export function effect(fn: Function, options: { scheduler: Function }) {
  const reactiveEffect = new ReactiveEffect(fn)

  // 将用户传进来的option和reactiveEffect结合， 主要是覆盖scheduler方法
  Object.assign(reactiveEffect, options)

  reactiveEffect.run()
  const runner = reactiveEffect.run.bind(reactiveEffect)
  runner.effect = reactiveEffect
  return runner
}

export class ReactiveEffect {
  constructor(public fn: Function) {}

  notify() {
    this.scheduler()
  }

  /**
   * 默认让scheduler执行run方法， scheduler方法可能后面会被用户传的option中同名方法覆盖掉
   */
  scheduler() {
    this.run()
  }

  run() {
    // 先将当前的 effect 保存起来，用来处理嵌套的逻辑
    const prevSub = activeSub

    /**
     * todo
     *  标准 Vue 的行为是“每次执行 effect 都会重新收集”，以支持动态依赖切换；它之所以不会越堆越多，是因为它有“去重 + 旧依赖清理”
     *
     *  cleanup = () => {
     *     for (const link of this.deps) unlinkEffectFromDep(link.dep, this)
     *     this.deps.clear()
     *   }
     *   run() {
     *     const prev = activeSub
     *     this.cleanup()      // 重要：先清理旧依赖
     *     activeSub = this
     *     try { return this.fn() } finally { activeSub = prev }
     *   }
     */
    activeSub = this

    try {
      return this.fn()
    } finally {
      // 执行完成后，恢复之前的 effect
      activeSub = prevSub
    }
  }
}
