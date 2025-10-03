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

function preCleanEffect(effect: ReactiveEffect) {
  // 将本次轮回大巴🚌标记为第几号大巴，这样如果当前effect已经被收集过了，那么就直接拿来复用，只要更新一下它的Id就好了
  effect._trackId++
  // 每次轮回开始 依赖数初始都是0， 都是从0开始收集的
  effect._depsLength = 0
}

function postCleanEffect(effect: ReactiveEffect) {
  // deps数组的长度
  const len = effect.deps.length
  // 有效依赖的个数
  const n = effect._depsLength
  for (let i = n; i < len; i++) {
    // 删除映射表中对应的effect
    // 删除未依赖的 dep -> effect
    cleanDepEffect(effect.deps[i], effect)
  }
  // 更新依赖列表的长度
  effect.deps.length = n
}

export class ReactiveEffect {
  // 控制创建的effect是否是响应式的
  public active = true

  /**
   * 用于记录当前effect执行了几次
   * 每次重新收集依赖的Id都是唯一的，相当于标记轮回转世的每一世
   */
  public _trackId = 0

  /**
   * 本次 effect.run()运行完之后， 它代表执行期间收集的仍然有效的依赖数量
   * 在收集过程中主要给this.deps充当一个滑动’游标‘， 也就是一个指针，指向当前effect收集到deps的几位了
   * 所以重命名为currentDepIndex更合适一些
   */
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

      // initDepMarkers
      preCleanEffect(this)

      return this.fn()
    } finally {
      postCleanEffect(this)
      activeEffect = lastEffect
    }
  }

  stop() {
    this.active = false
  }
}

function cleanDepEffect(dep: DepMap, effect: ReactiveEffect) {
  dep.delete(effect)
  if (dep.size === 0) dep.cleanup?.()
}

/**
 * 收集依赖
 * 需要解决的问题。
 * 上次假设收集的依赖是， [name, age, gender, aaa, bbb, ccc]
 * 本次是：[name, another]
 * 那么首先要把name要复用，age要删除， 替换成another, 最后再把abc都删除掉。
 *
 * 所以就像是一个diff的过程
 * @param effect
 * @param dep
 */
export const trackEffect = (effect: ReactiveEffect, dep: DepMap) => {
  // 获取到之前第几次轮回被收集，因为我们在preCleanEffect中将eff._trackId加1了，oldTrackId就可能和之前Map存在的不一样
  const oldTrackId = dep.get(effect)
  /**
   * 如果oldTrackId有值且和effect._trackId一样，说明是在本次轮回中被收集的。
   * 那么可能的情况就是fn中重复出现了 state.name，那么不用重复收集，直接跳过即可
   *
   * 如果oldTrackId不存在, 那么就是第一次收集，之前没收集过
   */
  if (oldTrackId !== effect._trackId) {
    // 所以，这里要么effect不存在首次收集，要么是上一轮旧的。用新值覆盖即可
    dep.set(effect, effect._trackId)

    /**
     * 更新effect的deps，看下面示例
     * 小例子（顺序变化）
     * 上轮依赖顺序为 [A, B, C]，本轮访问顺序为 [B, A]：
     * currentDepIndex=0：oldDep=A，新 dep=B，不同 → 覆盖为 B，解绑 A
     * currentDepIndex=1：oldDep=B，新 dep=A，不同 → 覆盖为 A，解绑 B
     * 收尾截断把剩余的 C 清理掉
     * 最终得到 [B, A]，且旧关系被正确移除。
     */
    const currentDepIndex = effect._depsLength

    /**
     * 以下代码存在的bug：
     * const currentDepIndex = effect._depsLength
     * const oldDep = effect.deps[currentDepIndex]
     * if (oldDep !== dep) {
     *   effect.deps[currentDepIndex] = dep
     *   if (oldDep) cleanDepEffect(oldDep, effect)
     * }
     * effect._depsLength++
     *
     * 复盘：为什么会误删
     * 场景：旧一轮 effect.deps = [A, B, C]，新一轮访问顺序是 [B, A]。
     * 第一次访问 B：
     * 位置 0 被覆盖为 B，并解绑旧位置 0 的 A。
     * 暂态数组变为 [B, B, C]（位置 1 仍是旧的 B）。
     * 第二次访问 A：
     * 位置 1 被覆盖为 A，并解绑旧位置 1 的 B。
     * 由于“解绑旧位置 1 的 B”会从 B 的 dep 中删除当前 effect，这会把“刚在位置 0 新增的 B 订阅”一并删掉（因为 dep.delete(effect) 不区分数组里哪个位置引用了它）。
     * 结果：本轮结束后，B 的订阅被误删，后续对 B 的变更将不再触发该 effect。
     */

    // 只覆盖当前位置并推进游标，不在此处解绑旧依赖。
    // 这样在依赖访问顺序发生交换时，避免误删仍需保留的 dep（统一由 postCleanEffect 收尾清理 [n, len)）。
    effect.deps[currentDepIndex] = dep
    effect._depsLength++
  }

  // dep.set(effect, effect._trackId)
  // effect.deps[effect._depsLength++] = dep
}

export const triggerEffects = (dep: DepMap) => {
  for (const effect of dep.keys()) {
    if (effect.scheduler) {
      effect.scheduler()
    }
  }
}
