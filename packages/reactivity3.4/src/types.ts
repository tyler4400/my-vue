import { ReactiveEffect } from './effect'

export type ObJKey = string | symbol

/**
 * map的key是副作用函数，value是标记它是第几个轮回被收集的
 */
export type DepMap = Map<ReactiveEffect, number> & {
  cleanup?: () => void
  depName?: ObJKey // 开发时为了让dep在调试时更有辨识度
}

export type Scheduler = (...args: any[]) => any

export type EffectOptions = {
  scheduler?: Scheduler
}
