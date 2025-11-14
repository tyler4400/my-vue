import { VNode, VNodeArrayChildren, VNodeProps, VNodeTypes } from './types'
import { isArray, isFunction, isObject, isString, ShapeFlags } from '@vue/shared'

export const Text = Symbol.for('v-txt')
export const Fragment = Symbol.for('v-fgt')

export function createVnode(
  type: VNodeTypes,
  props: VNodeProps = null,
  children: VNodeArrayChildren | string | null = null,
): VNode {
  let shapeFlag: number
  if (isString(type)) {
    // Dom元素
    shapeFlag = ShapeFlags.ELEMENT
  } else if (isObject(type)) {
    // 组件
    shapeFlag = ShapeFlags.STATEFUL_COMPONENT
  } else if (isFunction(type)) {
    // 函数式组件。不推荐使用了，Vue3中没有做任何优化
    shapeFlag = ShapeFlags.FUNCTIONAL_COMPONENT
  } else {
    shapeFlag = 0
  }

  const vnode: VNode = {
    __v_isVnode: true,
    type,
    props,
    children,
    key: props?.key as PropertyKey,
    el: null,
    shapeFlag,
    component: null,
    ref: props?.ref,
  }
  if (children !== null) {
    // compiled element vnode - if children is passed, only possible types are
    // orderItems or Array.
    if (isArray(children)) {
      vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
    } else if (isObject(children)) {
      // 组件的children是插槽（slots）, children是object的时候一定是插槽
      // null 不可以省略
      // h(RenderComponent, null, {
      //   header: (t) => h('header', 'header-content' + t),
      //   footer: (t) => h('footer', 'footer-content' + t),
      // })
      vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN
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
