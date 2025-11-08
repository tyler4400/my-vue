import { VNode, VNodeArrayChildren, VNodeProps, VNodeTypes } from './types'
import { isArray, isObject, isString, ShapeFlags } from '@vue/shared'

export const Text = Symbol.for('v-txt')
export const Fragment = Symbol.for('v-fgt')

export function createVnode(
  type: VNodeTypes,
  props: VNodeProps = null,
  children: VNodeArrayChildren | string | null = null,
): VNode {
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT // Dom元素
    : isObject(type)
      ? ShapeFlags.STATEFUL_COMPONENT // vue组件
      : 0

  const vnode: VNode = {
    __v_isVnode: true,
    type,
    props,
    children,
    key: props?.key as PropertyKey,
    el: null,
    shapeFlag,
    component: null,
  }
  if (children !== null) {
    // compiled element vnode - if children is passed, only possible types are
    // string or Array.
    if (isArray(children)) {
      vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
    } else {
      vnode.children = String(children)
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
