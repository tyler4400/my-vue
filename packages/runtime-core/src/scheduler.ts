export interface SchedulerJob extends Function {
  id?: number
  pre?: boolean
  active?: boolean
  computed?: boolean
  /**
   * Indicates whether the effect is allowed to recursively trigger itself
   * when managed by the scheduler.
   *
   * By default, a job cannot trigger itself because some built-in method calls,
   * e.g. Array.prototype.push actually performs reads as well (#1740) which
   * can lead to confusing infinite loops.
   * The allowed cases are component update functions and watch callbacks.
   * Component update functions may update child component props, which in turn
   * trigger flush: "pre" watch callbacks that mutates state that the parent
   * relies on (#1801). Watch callbacks doesn't track its dependencies so if it
   * triggers itself again, it's likely intentional and it is the user's
   * responsibility to perform recursive state mutation that eventually
   * stabilizes (#1727).
   */
  allowRecurse?: boolean
  /**
   * Attached by renderer.ts when setting up a component's render effect
   * Used to obtain component information when reporting max recursive updates.
   */
  i?: 'ComponentInternalInstance'
}

/**
 * 这里使用了全局队列
 * 多个组件调用 queueJob 会被合并到同一个全局 queue，由那一个微任务回调一次性 flush；
 * flush 期间新产生的任务会被刻意安排到“下一轮微任务”，互不打架。
 */
const queue: SchedulerJob[] = []

let isFlushing = false
const resolvedPromise = Promise.resolve()

export function queueJob(job: SchedulerJob) {
  if (!queue.includes(job)) {
    queue.push(job)
  }
  if (!isFlushing) {
    // 是否在微队列中， 没有就放到微队列
    isFlushing = true
    resolvedPromise.then(() => {
      // .then就是放入到微队列
      /**
       * 本实现特意在微任务回调一开始就把 isFlushing 置回 false，并用“快照 + 清空”执行。
       * 这意味着 flush 过程中再次调用 queueJob 会注册“下一轮微任务”处理，而不是插入到“当前这轮 flush”的执行里，
       * 从而避免单轮不断追加导致的饿死绘制/重入复杂性。
       * 所以微任务一开始就必须把isFlushing 置回 false！！
       */
      isFlushing = false
      const copy = queue.slice()
      queue.length = 0
      copy.forEach(job => job())
      copy.length = 0
    })
  }
}
