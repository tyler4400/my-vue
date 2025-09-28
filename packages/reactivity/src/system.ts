import { RefImpl } from './ref'
import { ReactiveEffect } from './effect'

/**
 * 依赖项。
 * 就是ref
 */
interface Dep {
  // 订阅者链表的头节点
  headSubs: Link | undefined
  // 订阅者链表的尾节点
  tailSubs: Link | undefined
}

/**
 * 订阅者
 * 就是值变化的时候，要通知到的list集合，
 * 在get value的时候被收集
 */
interface Sub {
  headDeps: Link | undefined
  tailDeps: Link | undefined
}

export interface Link {
  // 订阅者
  sub: Sub
  // 依赖项
  dep: Dep
  nextSub: Link | undefined
  prevSub: Link | undefined
}

/**
 * 将sub（依赖函数）塞到dep（也就是ref）的链表中
 * @param dep
 * @param sub
 */
export function linkEffectToSubscription(dep: RefImpl, sub: ReactiveEffect) {
  const newLink: Link = {
    sub,
    nextSub: undefined,
    prevSub: undefined,
  }

  /**
   * 关联链表关系，分两种情况
   * 1. 尾节点有，那就往尾节点后面加
   * 2. 如果尾节点没有，则表示第一次关联，那就往头节点加，头尾相同
   */
  if (dep.tailSubs) {
    dep.tailSubs.nextSub = newLink
    newLink.prevSub = dep.tailSubs
    dep.tailSubs = newLink
  } else {
    dep.tailSubs = newLink
    dep.headSubs = newLink
  }
}

/**
 * 传播更新的函数
 */
export function propagate(subscription: Link) {
  let link = subscription
  const queueEffect: ReactiveEffect[] = []
  while (link) {
    queueEffect.push(link.sub)
    link = link.nextSub
  }
  for (const effect of queueEffect) {
    effect.notify()
  }
}
