import { ReactiveEffect } from './effect'

export type ObJKey = string | symbol

/**
 * map的key是副作用函数，value是标记它是第几个轮回被收集的
 */
export type DepMap = Map<ReactiveEffect, number> & {
  cleanup?: () => void
  depName?: ObJKey
}
