import {
  Data,
  HostElement,
  HostNode,
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
      // console.log('渲染子元素', child)
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

  const mountElement = (vnode: VNode, container: HostElement, anchor: HostNode) => {
    const { type, children, props, shapeFlag } = vnode
    // console.log('渲染的vnode', vnode, shapeFlag)
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

    hostInsert(el, container, anchor)
  }

  const unmount = (vnode: VNode) => {
    hostRemove(vnode.el)
  }

  const patch = (lastVnode: VNode | null, newVnode: VNode, container: HostElement, anchor: HostNode = null) => {
    if (lastVnode === newVnode) return
    if (lastVnode === null) {
      // lastVnode不存在，新建
      mountElement(newVnode, container, anchor)
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
      mountElement(newVnode, container, anchor)
    }
  }

  /**
   * 进入到当前方法的，说明新旧vnode都存在，且新旧vnode的type和key都相同
   * 那么就复用他们的el，更新他们的props和children
   * @param lastVnode
   * @param newVnode
   * @param container 实际没用到
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
  const patchChildren = (lastVnode: VNode, newVnode: VNode, el: HostElement) => {
    const lastShape = lastVnode.shapeFlag
    const newShape = newVnode.shapeFlag

    const lastChildren = lastVnode.children
    const newChildren = newVnode.children

    if (isTextChildren(lastShape)) {
      if (isTextChildren(newShape) && lastChildren !== newChildren) {
        hostSetElementText(el, newChildren as string)
      }
      if (newChildren === null) {
        hostSetElementText(el, '')
      }
      if (isArrayChildren(newShape)) {
        hostSetElementText(el, '')
        mountChildren(newChildren as VNodeArrayChildren, el)
      }
    }

    if (isArrayChildren(lastShape)) {
      if (isTextChildren(newShape)) {
        unmountChildren(lastChildren as VNodeArrayChildren)
        hostSetElementText(el, newChildren as string)
      }
      if (isArrayChildren(newShape)) {
        patchKeyedChildren(lastChildren as VNodeArrayChildren, newChildren as VNodeArrayChildren, el)
      }
      if (newChildren === null) {
        unmountChildren(lastChildren as VNodeArrayChildren)
      }
    }
    if (lastChildren === null) {
      if (isTextChildren(newShape)) {
        hostSetElementText(el, newChildren as string)
      }
      if (isArrayChildren(newShape)) {
        mountChildren(newChildren as VNodeArrayChildren, el)
      }
    }
  }

  /**
   *  强烈建议看此段代码的时候搭配`07-patchKeyedChildren函数解释说明.md` 一起看
   *
   *  比较两个vnodeList的差异，并用2去更新1更新el，注意必须是含有key节点
   *   常用到的api：appendChild、removeChild、insertBefore
   *
   *  1. 先从头比一遍， 再从尾部diff一遍。 减少比对范围，增加复用范围。
   *  2. 再针对各种情形分别判断
   */
  const patchKeyedChildren = (vnodeList1: VNodeArrayChildren, vnodeList2: VNodeArrayChildren, el: HostElement) => {
    let head = 0 // 开始比对的头索引
    let tail1 = vnodeList1.length - 1 // 第一个数组的尾部索引
    let tail2 = vnodeList2.length - 1 // 第二个数组的尾部索引

    // 1. sync from start
    // (a b) c
    // (a b) d e
    // 先从头diff一遍，
    while (head <= tail1 && head <= tail2) {
      const node1 = vnodeList1[head] as VNode
      const node2 = vnodeList2[head] as VNode
      if (isSameVnode(node1, node2)) {
        patch(node1, node2, el) // 这里其实可以直接走patchElement
      } else {
        /**
         * 旧为 [A,B,C]，新为 [A,B,D,E]
         * 那么到C的时候就应该停止
         */
        break
      }
      head++
    }

    // 2. sync from end
    // a (b c)
    // d e (b c)
    // 再从尾部diff一遍。 减少比对范围，增加复用范围。
    while (head <= tail1 && head <= tail2) {
      const node1 = vnodeList1[tail1] as VNode
      const node2 = vnodeList2[tail2] as VNode
      if (isSameVnode(node1, node2)) {
        patch(node1, node2, el)
      } else {
        break
      }
      tail1--
      tail2--
    }
    console.log('头尾分别diff一遍，结束时此时头，尾1，尾2指针所处位置：', head, tail1, tail2)

    // 3. common sequence + mount
    // (a b)
    // (a b) c
    // i = 2, e1 = 1, e2 = 2
    // (a b)
    // c (a b)
    // i = 0, e1 = -1, e2 = 0
    // 对新增的进行挂载
    if (head > tail1) {
      if (head <= tail2) {
        // 新节点单纯比旧节点多的时候（中间是一样的， 不管是尾多还是头多），肯定是 ```head > tail1 && head <= tail2```
        // 此时，head到tail2的部分就是新增的部分，我们把它们patch到tail2的下一位之前
        const nextPos = tail2 + 1
        const anchor = (vnodeList2[nextPos] as VNode)?.el
        while (head <= tail2) {
          patch(null, vnodeList2[head] as VNode, el, anchor)
          head++
        }
      }
    }

    // 4. common sequence + unmount
    // (a b) c
    // (a b)
    // i = 2, e1 = 2, e2 = 1
    // a (b c)
    // (b c)
    // i = 0, e1 = 0, e2 = -1
    // 对删除的进行卸载
    if (head > tail2) {
      if (head <= tail1) {
        while (head <= tail1) {
          unmount(vnodeList1[head] as VNode)
          head++
        }
      }
    }

    // 5. unknown sequence
    // [i ... e1 + 1]: a b [c d e] f g
    // [i ... e2 + 1]: a b [e d c h] f g
    // i = 2, e1 = 4, e2 = 5
    else {
      const s1 = head // prev starting index // 就是除去头尾之后，中间不一样的部分的初始下标 [c d e]
      const s2 = head // next starting index // [e d c h]的初始下标

      // 5.1 build key:index map for newChildren 做一个映射表用于快速查找
      const keyToNewIndexMap: Map<PropertyKey, number> = new Map()
      for (let i = s2; i <= tail2; i++) {
        keyToNewIndexMap.set((vnodeList2[i] as VNode).key, i)
      }
      console.log('renderer.ts-patchKeyedChildren-keyToNewIndexMap: ', keyToNewIndexMap)

      // 5.2 看老的是否在新的里面，老的没有就删除，有的话就更新
      for (let i = s1; i <= tail1; i++) {
        const vnode = vnodeList1[i] as VNode
        const indexInNew = keyToNewIndexMap.get(vnode?.key)
        if (indexInNew === undefined) {
          // 如果新的里面找不到则说明老的有的要删除
          unmount(vnode)
        } else {
          patch(vnode, vnodeList2[indexInNew] as VNode, el)
        }
      }

      // 5.3 上面虽然将老的更新了， 但是顺序可能不对， 而且还可能还有新建的元素
      const toBePatchedLength = tail2 - s2 + 1 // [e d c h]的长度
      for (let i = toBePatchedLength - 1; i >= 0; i--) {
        const index = s2 + i // [e d c h]倒序在vnodeList2中的下标
        const anchor = (vnodeList2[index + 1] as VNode)?.el
        const vnode = vnodeList2[index] as VNode
        if (!vnode.el) {
          // 如果vnode.el不存在，就说明这个vnode是新建的，还从来没有渲染到页面中。那么就插入
          patch(null, vnode, el, anchor)
        } else {
          // 如果vnode.el存在，说明在上一步中已经patch了，这时候就移动它的位置
          hostInsert(vnode.el, el, anchor) // 底层的insertBefore()会判断给定的节点是否已经存在于文档中， 如果是，则会将其从当前位置移动到新位置。所以这个方法也能当move用
        }
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
