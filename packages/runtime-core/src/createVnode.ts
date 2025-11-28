import { VNode, VNodeArrayChildren, VNodeProps, VNodeTypes } from './types'
import { isArray, isFunction, isObject, isString, PatchFlags, ShapeFlags } from '@vue/shared'
import { isTeleport } from './components/Teleport'

export const Text = Symbol.for('v-txt')
export const Fragment = Symbol.for('v-fgt')

export function createVnode(
  type: VNodeTypes,
  props: VNodeProps = null,
  children: VNodeArrayChildren | string | null = null,
  patchFlag?: PatchFlags,
): VNode {
  let shapeFlag: number
  if (isString(type)) {
    // Dom元素
    shapeFlag = ShapeFlags.ELEMENT
  } else if (isTeleport(type)) {
    // 是内置组件Teleport
    shapeFlag = ShapeFlags.TELEPORT
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
    key: props?.key ?? null,
    el: null,
    shapeFlag,
    component: null,
    ref: props?.ref,
    target: null,
    transition: null,
    patchFlag,
    dynamicChildren: null,
    appContext: null,
  }

  if (currentBlock && patchFlag > 0) {
    currentBlock.push(vnode)
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

let currentBlock = null
export function openBlock() {
  currentBlock = [] // 用于收集动态节点
}
export function closeBlock() {
  currentBlock = null
}
export function setupBlock(vnode) {
  vnode.dynamicChildren = currentBlock // 当前elementBlock会收集子节点，用当前block来收集
  closeBlock()
  return vnode
}
// block 有收集虚拟节点的功能
export function createElementBlock(type, props, children?, patchFlag?) {
  return setupBlock(createVnode(type, props, children, patchFlag))
}
export function toDisplayString(value) {
  return isString(value) ? value : value === null ? '' : isObject(value) ? JSON.stringify(value) : String(value)
}

export { createVnode as createElementVNode }

export { createVnode as createVNode }
