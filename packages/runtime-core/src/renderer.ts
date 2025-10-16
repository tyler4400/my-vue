import {
  HostElement,
  MountChildrenFn,
  Renderer,
  RendererOptions,
  RootRenderFunction,
  VNode,
  VNodeArrayChildren,
} from './types'
import { ShapeFlags } from '@vue/shared'

export function createRenderer(renderOptions: RendererOptions): Renderer {
  const {
    insert: hostInsert,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    remove: hostRemove,
    createElement: hostCreateElement,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    createText: hostCreateText,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setText: hostSetText,
    setElementText: hostSetElementText,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    parentNode: hostParentNode,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    nextSibling: hostNextSibling,
    patchProp: hostPatchProp,
  } = renderOptions

  /**
   * 暂时放一种更优的写法，兼顾了child是string等情形。但是先不着急加上， 看课程后续是否有优化这里
   * function mountChildren(children, container) {
   *   for (const child of children) {
   *     if (Array.isArray(child)) {
   *       mountChildren(child, container)         // 递归扁平化
   *       continue
   *     }
   *     if (child == null || typeof child === 'boolean') {
   *       continue                                // 忽略空/布尔
   *     }
   *     if (typeof child === 'string' || typeof child === 'number') {
   *       const textNode = hostCreateText(String(child))
   *       hostInsert(textNode, container)         // 直接作为文本节点插入
   *       continue
   *     }
   *     // 走 vnode 路径
   *     patch(null, child as VNode, container)
   *   }
   * }
   * @param children
   * @param container
   */
  const mountChildren: MountChildrenFn = (children, container) => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      // todo 处理 child别的类型，暂时都按照vnode处理，child还可能是string
      console.log('renderer.ts-mountChildren-child: ', child)
      patch(null, child as VNode, container)
    }
  }

  const mountElement = (vnode: VNode, container: HostElement) => {
    const { type, children, props, shapeFlag } = vnode
    console.log(vnode, shapeFlag, ShapeFlags.TEXT_CHILDREN)
    const el = hostCreateElement(type as string)
    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }

    /**
     * 与运算
     * shapeFlag & ShapeFlags.TEXT_CHILDREN 的结果如果大于0，说明包含TEXT_CHILDREN
     * 所以这个shapeFlag就相当于是一个list的集合，下面代码等同于
     * shapeFlag.contains(ShapeFlags.TEXT_CHILDREN)
     */
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children as string)
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children as VNodeArrayChildren, el)
    }

    hostInsert(el, container)
  }

  /**
   * @param n1 lastVnode
   * @param n2 newVnode
   * @param container
   */
  const patch = (n1: VNode | null, n2: VNode, container: HostElement) => {
    if (n1 === n2) return
    if (n1 === null) {
      mountElement(n2, container)
    } else {
      // lastVnode和n2都有， 那就需要更新了 todo
      console.log('todo: 更新vnode')
    }
  }

  /**
   * 多次调用render 会进行虚拟节点的比较,再进行更新
   * @param vnode
   * @param container
   */
  const render: RootRenderFunction = (vnode, container) => {
    if (vnode == null) {
      if (container._vnode) {
        // 需要卸载 todo
        // unmount(container._vnode, null, null, true)
        console.log('需要卸载')
      }
    } else {
      // 将虚拟节点变成真实节点进行渲染
      patch(container._vnode || null, vnode, container)
    }

    // _vnode保存上次的vnode， 做对比用
    container._vnode = vnode
  }

  return {
    render,
  }
}
