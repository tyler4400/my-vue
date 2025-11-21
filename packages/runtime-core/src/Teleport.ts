import { ComponentInternalInstance, HostElement, HostNode, VNode, VNodeArrayChildren } from '@vue/runtime-core'
import { isArrayChildren } from '@vue/shared'

export const Teleport = {
  name: 'Teleport',
  __isTeleport: true,
  process(
    lastVnode: VNode | null,
    newVnode: VNode,
    container: HostElement,
    anchor: HostNode,
    parentComponent: ComponentInternalInstance,
    internals: any,
  ) {
    const { mountChildren, patchChildren, move } = internals
    if (!lastVnode) {
      const target = (newVnode.target = document.querySelector(newVnode.props.to))
      if (target) {
        const normalized = isArrayChildren(newVnode.shapeFlag)
          ? (newVnode.children as VNodeArrayChildren)
          : [newVnode.children as any] // mountChildren 会把 '123' 规范化成 Text VNode

        mountChildren(normalized, target, parentComponent)
      } else {
        console.error('未找到挂载点')
      }
    } else {
      // todo 潜在bug 如果不是数组会报错 见case： 11-组件的渲染3.html
      patchChildren(lastVnode, newVnode, lastVnode.target, parentComponent)
      if (lastVnode.props.to !== newVnode.props.to) {
        const newTarget = document.querySelector(newVnode.props.to)
        ;(newVnode.children as VNodeArrayChildren).forEach(child => move(child, newTarget, anchor))
      }
    }
  },
  remove(vnode: VNode, unmountChildren) {
    const { shapeFlag, children } = vnode
    if (isArrayChildren(shapeFlag)) {
      unmountChildren(children)
    } else {
      console.error('Teleport的children不是array')
    }
  },
}

export const isTeleport = (val: any) => val?.__isTeleport
