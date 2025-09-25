import { RefImpl } from './ref'

export interface Link {
  sub: Function
  nextSub: Link | undefined
  prevSub: Link | undefined
}

/**
 * 将sub（依赖函数）塞到dep（也就是ref）的链表中
 * @param dep
 * @param sub
 */
export function link(dep: RefImpl, sub: Function) {
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
  if (dep.tailSubscription) {
    dep.tailSubscription.nextSub = newLink
    newLink.prevSub = dep.tailSubscription
    dep.tailSubscription = newLink
  } else {
    dep.tailSubscription = newLink
    dep.headSubscription = newLink
  }

  console.log('link', dep.headSubscription)
}
