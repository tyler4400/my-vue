import { VNode, VNodeArrayChildren, VNodeProps, VNodeTypes } from './types'
import { isArray, isString, ShapeFlags } from '@vue/shared'

export function createVnode(
  type: VNodeTypes,
  props: VNodeProps = null,
  children: VNodeArrayChildren | string | null = null,
): VNode {
  const shapeFlag = isString(type) ? ShapeFlags.ELEMENT : 0

  const vnode: VNode = {
    __v_isVnode: true,
    type,
    props,
    children,
    key: props?.key as PropertyKey,
    el: null,
    shapeFlag,
  }
  if (children !== null) {
    if (isArray(children)) {
      vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
    } else {
      // todo 暂时只有array 和 text两种，没有内置组件等
      children = String(children)
      vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
    }
  }

  return vnode
}

export function isVnode(value: any) {
  return value?.__v_isVnode
}

export function isSameVnode(n1: VNode, n2: VNode) {
  return n1 && n2 && n1.type === n2.type && n1.key === n2.key
}
