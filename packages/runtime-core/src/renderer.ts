import {
  Data,
  HostElement,
  MountChildrenFn,
  Renderer,
  RendererOptions,
  RootRenderFunction,
  VNode,
  VNodeArrayChildren,
} from './types'
import { isArray, isArrayChildren, isTextChildren } from '@vue/shared'
import { isSameVnode } from './createVnode'

export function createRenderer(renderOptions: RendererOptions): Renderer {
  const {
    insert: hostInsert,
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
      console.log('渲染子元素', child)
      patch(null, child as VNode, container)
    }
  }

  const unmountChildren = (children: VNodeArrayChildren) => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (isArray(child)) {
        unmountChildren(child)
      } else {
        unmount(child as VNode)
      }
    }
  }

  const mountElement = (vnode: VNode, container: HostElement) => {
    const { type, children, props, shapeFlag } = vnode
    console.log('渲染的vnode', vnode, shapeFlag)
    const el = hostCreateElement(type as string)
    vnode.el = el // 让vnode指向真实的el // todo 之前在 mountChildren的时候 未考虑string， 如果这里的vnode是字符串， 那么这一行就会保存， string是基本变量， 没有属性
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
    if (isTextChildren(shapeFlag)) {
      hostSetElementText(el, children as string)
    } else if (isArrayChildren(shapeFlag)) {
      mountChildren(children as VNodeArrayChildren, el)
    }

    hostInsert(el, container)
  }

  const unmount = (vnode: VNode) => {
    hostRemove(vnode.el)
  }

  const patch = (lastVnode: VNode | null, newVnode: VNode, container: HostElement) => {
    if (lastVnode === newVnode) return
    if (lastVnode === null) {
      // lastVnode不存在，新建
      mountElement(newVnode, container)
      return
    }
    if (isSameVnode(lastVnode, newVnode)) {
      // lastVnode 存在， last和new指向也相同，那就要更新属性props和child
      patchElement(lastVnode, newVnode, container)
    } else {
      // lastVnode 存在， last和new指向不相同，直接移除老的dom元素,初始化新的dom元素
      console.log('lastVnode 存在， last和new指向不相同，直接移除老的dom元素,初始化新的dom元素', lastVnode, newVnode)
      unmount(lastVnode)
      lastVnode = null
      mountElement(newVnode, container)
    }
  }

  /**
   * 进入到当前方法的，说明新旧vnode都存在，且新旧vnode的type和key都相同
   * 那么就复用他们的el，更新他们的props和children
   */
  const patchElement = (lastVnode: VNode, newVnode: VNode, container: HostElement) => {
    console.log('进入到当前方法的，说明新旧vnode都存在，且新旧vnode的type和key都相同: ', lastVnode, newVnode, container)
    // 复用 dom元素， 也就是el。 然后对属性和child进行更新
    const el = (newVnode.el = lastVnode.el)

    const oldProps = lastVnode.props || {}
    const newProps = newVnode.props || {}

    patchProps(oldProps, newProps, el as HostElement)
    patchChildren(lastVnode, newVnode, el as HostElement)
  }

  const patchProps = (oldProps: Data, newProps: Data, el: HostElement) => {
    // 新的要全部生效
    for (const key in newProps) {
      hostPatchProp(el, key, oldProps[key], newProps[key])
    }
    for (const key in oldProps) {
      if (!(key in newProps)) {
        //以前有，现在没有，要删除掉
        hostPatchProp(el, key, oldProps[key], null)
      }
    }
  }

  /**
   * 总结原视频内容后: 目前子节点只考虑可能是 text/array/null
   * (text, text/null) => unmountChildren老节点，或者hostSetElementText新节点
   * (text, array) => 移除老节点，mountChildren
   * (array, array) => 全量diff
   * (array, text/null) => unmountChildren, hostSetElementText新节点
   * (null, text/null) => 或hostSetElementText新节点
   * (null, array) => mountChildren新节点
   *
   *
   *   // 原视频中内容：
   *   1. 老的是数组，新的是文本，移除老的子节点，挂载新的文本
   *   2. 老的是文本，新的是文本，内容不同进行替换
   *   3. 老的是数组，新的是数组，全量diff
   *   4. 老的是数组，新的不是数组，移除老的子节点
   *   5. 老的是文本，新的是空
   *   6. 老的是文本，新的是数组
   */
  const patchChildren = (lastVnode: VNode, newVnode: VNode, container: HostElement) => {
    const lastShape = lastVnode.shapeFlag
    const newShape = newVnode.shapeFlag

    const lastChildren = lastVnode.children
    const newChildren = newVnode.children

    if (isTextChildren(lastShape)) {
      if (isTextChildren(newShape) && lastChildren !== newChildren) {
        hostSetElementText(container, newChildren as string)
      }
      if (newChildren === null) {
        hostSetElementText(container, '')
      }
      if (isArrayChildren(newShape)) {
        hostSetElementText(container, '')
        mountChildren(newChildren as VNodeArrayChildren, container)
      }
    }

    if (isArrayChildren(lastShape)) {
      if (isTextChildren(newShape)) {
        unmountChildren(lastChildren as VNodeArrayChildren)
        hostSetElementText(container, newChildren as string)
      }
      if (isArrayChildren(newShape)) {
        console.log('todo: 子节点都是array， 需要全量diff')
      }
      if (newChildren === null) {
        unmountChildren(lastChildren as VNodeArrayChildren)
      }
    }
    if (lastChildren === null) {
      if (isTextChildren(newShape)) {
        hostSetElementText(container, newChildren as string)
      }
      if (isArrayChildren(newShape)) {
        mountChildren(newChildren as VNodeArrayChildren, container)
      }
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
        unmount(container._vnode)
      }
    } else {
      // 将虚拟节点变成真实节点进行渲染
      patch(container._vnode || null, vnode, container)
    }

    // _vnode保存上次的vnode， 做对比用。  vnode.el和container._vnode互为引用
    container._vnode = vnode
  }

  return {
    render,
  }
}
