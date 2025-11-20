import {
  ComponentInternalInstance,
  Data,
  FunctionalComponent,
  HostElement,
  HostNode,
  InternalSlots,
  MountChildrenFn,
  Renderer,
  RendererOptions,
  RootRenderFunction,
  SetupContext,
  VNode,
  VNodeArrayChildren,
  VNodeProps,
  VNodeRef,
} from './types'
import {
  isArray,
  isArrayChildren,
  isComponent,
  isElement,
  isNumber,
  isObject,
  isSlotsChildren,
  isStatefulComponent,
  isString,
  isTextChildren,
} from '@vue/shared'
import { createVnode, Fragment, isSameVnode, Text } from './createVnode'
import getSequence from './seq'
import { isRef, ReactiveEffect, Ref } from '@vue/reactivity3.4'
import { queueJob } from './scheduler'
import { createComponentInstance, setupComponent } from './component'
import { invokeArray } from './apiLifecycle'

export function createRenderer(renderOptions: RendererOptions): Renderer {
  const {
    insert: hostInsert,
    remove: hostRemove,
    createElement: hostCreateElement,
    createText: hostCreateText,
    setText: hostSetText,
    setElementText: hostSetElementText,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    parentNode: hostParentNode,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    nextSibling: hostNextSibling,
    patchProp: hostPatchProp,
  } = renderOptions

  const normalize = (children: VNode['children']) => {
    if (isArray(children)) {
      for (let i = 0; i < children.length; i++) {
        if (isString(children[i]) || isNumber(children[i])) {
          // 将字符串或数字转换为文本虚拟节点
          children[i] = createVnode(Text, null, String(children[i]))
        }
      }
    }
    return children
  }
  const mountChildren: MountChildrenFn = (children, container, parentComponent) => {
    normalize(children)
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      patch(null, child as VNode, container, null, parentComponent)
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

  const mountElement = (
    vnode: VNode,
    container: HostElement,
    anchor: HostNode,
    parentComponent: ComponentInternalInstance,
  ) => {
    const { type, children, props, shapeFlag } = vnode
    // console.log('渲染的vnode', vnode, shapeFlag)
    const el = hostCreateElement(type as string)
    vnode.el = el // 让vnode指向真实的el // todo 之前在 mountChildren的时候 未考虑string， 如果这里的vnode是字符串， 那么这一行就会报错， string是基本变量， 没有属性
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
      mountChildren(children as VNodeArrayChildren, el, parentComponent)
    }

    hostInsert(el, container, anchor)
  }

  const renderComponent = (instance: ComponentInternalInstance): VNode => {
    const { render, vnode, proxy, attrs } = instance
    if (isStatefulComponent(vnode.shapeFlag)) {
      return render.call(proxy, proxy)
    } else {
      // 其实传参不应该是attr，函数组件也可以定义props // https://cn.vuejs.org/guide/extras/render-function.html#functional-components
      return (vnode.type as FunctionalComponent)(attrs, {} as SetupContext)
    }
  }

  const updateComponentPreRender = (instance: ComponentInternalInstance, next: VNode) => {
    instance.vnode = next // instance.props
    instance.next = null
    updateProps(instance, instance.props, next.props ?? {})

    // 组件更新的时候 需要更新插槽
    // 同步 slots：children 为对象即视为 slots，否则置空
    if (isObject(next.children) && isSlotsChildren(next.shapeFlag)) {
      instance.slots = next.children as InternalSlots
    } else {
      instance.slots = {}
    }
  }

  function setupRenderEffect(instance: ComponentInternalInstance, container: HostElement, anchor: HostNode) {
    const componentUpdateFn = () => {
      console.log('组件自身状态更新了: ', instance)
      const { beforeMount, mounted } = instance
      if (!instance.isMounted) {
        invokeArray(beforeMount)

        const subTree = renderComponent(instance) // 两个参数分别为render函数中的this指向，和proxy参数
        // 首次挂载。 直接patch
        instance.subTree = subTree
        patch(null, subTree, container, anchor, instance)
        instance.isMounted = true

        invokeArray(mounted)
      } else {
        // 非首次就要对比了
        const { beforeUpdate, updated, next } = instance
        invokeArray(beforeUpdate)

        if (next) {
          // 更新属性和插槽
          updateComponentPreRender(instance, next)
        }

        const subTree = renderComponent(instance) // 两个参数分别为render函数中的this指向，和proxy参数
        patch(instance.subTree, subTree, container, anchor, instance)
        instance.subTree = subTree

        invokeArray(updated)
      }
    }

    const effect = new ReactiveEffect(componentUpdateFn, () => queueJob(update))
    const update = (instance.update = () => {
      effect.run()
    })
    update()
  }

  // 组件可以基于自己的状态重新渲染，effect
  const mountComponent = (
    newVnode: VNode,
    container: HostElement,
    anchor: HostNode,
    parentComponent: ComponentInternalInstance,
  ) => {
    // 1. 先创建组件实例，放到虚拟节点上
    const instance = (newVnode.component = createComponentInstance(newVnode, parentComponent))
    // 2. 给实例的属性赋值
    setupComponent(instance)
    // 3. 创建一个effect
    setupRenderEffect(instance, container, anchor)
  }

  const hasPropsChange = (lastProps: VNodeProps, newProps: VNodeProps) => {
    const lastKeys = Object.keys(lastProps)
    if (Object.keys(newProps).length !== lastKeys.length) {
      return true
    }
    for (let i = 0; i < lastKeys.length; i++) {
      const key = lastKeys[i]
      if (lastProps[key] !== newProps[key]) {
        return true
      }
    }
    return false
  }

  const updateProps = (instance: ComponentInternalInstance, lastProps: VNodeProps, newProps: VNodeProps) => {
    if (hasPropsChange(lastProps, newProps)) {
      for (const key in newProps) {
        // instance.props 是响应式的. 这一步就会触发effect
        instance.props[key] = newProps[key]
      }
      for (const key in instance.props) {
        // 删除旧的多余的属性
        if (!(key in newProps)) {
          delete instance.props[key]
        }
      }
    }
  }

  const updateComponent = (lastVnode: VNode, newVnode: VNode) => {
    const instance = (newVnode.component = lastVnode.component)

    if (shouldComponentUpdate(lastVnode, newVnode)) {
      instance.next = newVnode // 如果调用update的时候有next属性，说明是源自属性更新，插槽更新
      instance.update() // 让更新逻辑统一
    }
  }

  const shouldComponentUpdate = (lastVnode: VNode, newVnode: VNode) => {
    const { props: lastProps, children: lastChildren } = lastVnode
    const { props: newProps, children: newChildren } = newVnode

    if (lastChildren || newChildren) return true // 有插槽直接走重新渲染即可

    if (lastProps === newProps) return false

    return hasPropsChange(lastProps, newProps)
  }

  const unmount = (vnode: VNode) => {
    if (vnode.type === Fragment) {
      unmountChildren(vnode.children as VNodeArrayChildren)
    } else if (isComponent(vnode.shapeFlag)) {
      unmount(vnode.component.subTree)
    } else {
      hostRemove(vnode.el)
    }
  }

  const processText = (lastVnode: VNode | null, newVnode: VNode, container: HostElement) => {
    if (lastVnode === null) {
      newVnode.el = hostCreateText(newVnode.children as string)
      hostInsert(newVnode.el, container)
    } else {
      const el = (newVnode.el = lastVnode.el)
      if (lastVnode.children !== newVnode.children) {
        hostSetText(el, newVnode.children as string)
      }
    }
  }

  const processFragment = (
    lastVnode: VNode | null,
    newVnode: VNode,
    container: HostElement,
    parentComponent: ComponentInternalInstance,
  ) => {
    if (lastVnode === null) {
      mountChildren(newVnode.children as VNodeArrayChildren, container, parentComponent)
    } else {
      patchChildren(lastVnode, newVnode, container, parentComponent)
    }
  }

  const processElement = (
    lastVnode: VNode | null,
    newVnode: VNode,
    container: HostElement,
    anchor: HostNode = null,
    parentComponent: ComponentInternalInstance,
  ) => {
    if (lastVnode === null) {
      mountElement(newVnode, container, anchor, parentComponent)
    } else {
      patchElement(lastVnode, newVnode, container, parentComponent)
    }
  }

  const processComponent = (
    lastVnode: VNode | null,
    newVnode: VNode,
    container: HostElement,
    anchor: HostNode = null,
    parentComponent: ComponentInternalInstance,
  ) => {
    if (lastVnode === null) {
      mountComponent(newVnode, container, anchor, parentComponent)
    } else {
      updateComponent(lastVnode, newVnode)
    }
  }

  const patch = (
    lastVnode: VNode | null,
    newVnode: VNode,
    container: HostElement,
    anchor: HostNode = null,
    parentComponent: ComponentInternalInstance = null,
  ) => {
    if (lastVnode === newVnode) return
    if (lastVnode && !isSameVnode(lastVnode, newVnode)) {
      unmount(lastVnode)
      lastVnode = null
    }
    const { type, shapeFlag, ref } = newVnode
    switch (type) {
      case Text:
        processText(lastVnode, newVnode, container)
        break
      case Fragment:
        processFragment(lastVnode, newVnode, container, parentComponent)
        break
      default:
        if (isElement(shapeFlag)) {
          // 对元素（区别于组件）处理
          processElement(lastVnode, newVnode, container, anchor, parentComponent)
        }
        if (isComponent(shapeFlag)) {
          // 对组件的处理，Vue3中函数式组件已经废弃了，没有性能节约
          processComponent(lastVnode, newVnode, container, anchor, parentComponent)
        }
    }

    // 设置ref
    if (ref !== null) {
      setRef(ref, newVnode)
    }
    function setRef(rawRef: VNodeRef, vnode: VNode) {
      // 如果是组件，有定义expose就取expose没有就是代理实例。这个逻辑在3.5之后是只会是expose，不会暴露代理实例
      const value = isStatefulComponent(vnode.shapeFlag) ? vnode.component.exposed || vnode.component.proxy : vnode.el
      if (isRef(rawRef)) {
        ;(rawRef as Ref).value = value
      }
    }
  }

  /**
   * 进入到当前方法的，说明新旧vnode都存在，且新旧vnode的type和key都相同
   * 那么就复用他们的el，更新他们的props和children
   * @param lastVnode
   * @param newVnode
   * @param container 实际没用到
   * @param parentComponent
   */
  const patchElement = (
    lastVnode: VNode,
    newVnode: VNode,
    container: HostElement,
    parentComponent: ComponentInternalInstance,
  ) => {
    // console.log('进入到当前方法的，说明新旧vnode都存在，且新旧vnode的type和key都相同: ', lastVnode, newVnode, container)
    // 复用 dom元素， 也就是el。 然后对属性和child进行更新
    const el = (newVnode.el = lastVnode.el)

    const oldProps = lastVnode.props || {}
    const newProps = newVnode.props || {}

    patchProps(oldProps, newProps, el as HostElement)
    patchChildren(lastVnode, newVnode, el as HostElement, parentComponent)
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
  const patchChildren = (
    lastVnode: VNode,
    newVnode: VNode,
    el: HostElement,
    parentComponent: ComponentInternalInstance,
  ) => {
    const lastShape = lastVnode.shapeFlag
    const newShape = newVnode.shapeFlag

    const lastChildren = lastVnode.children
    const newChildren = normalize(newVnode.children)

    if (isTextChildren(lastShape)) {
      if (isTextChildren(newShape) && lastChildren !== newChildren) {
        hostSetElementText(el, newChildren as string)
      }
      if (newChildren === null) {
        hostSetElementText(el, '')
      }
      if (isArrayChildren(newShape)) {
        hostSetElementText(el, '')
        mountChildren(newChildren as VNodeArrayChildren, el, parentComponent)
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
        mountChildren(newChildren as VNodeArrayChildren, el, parentComponent)
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
    // console.log('头尾分别diff一遍，结束时此时头，尾1，尾2指针所处位置：', head, tail1, tail2)

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
      console.log('key是新node的key，value是位置索引: ', keyToNewIndexMap)

      const toBePatchedLength = tail2 - s2 + 1 // [e d c h]的长度
      const newIndexToOldMapIndex = new Array(toBePatchedLength).fill(0) // 中间的新的节点列表[e d c h]，他们对应的老节点的列表的索引

      // 5.2 看老的是否在新的里面，老的没有就删除，有的话就更新
      for (let i = s1; i <= tail1; i++) {
        const vnode = vnodeList1[i] as VNode
        const indexInNew = keyToNewIndexMap.get(vnode?.key)
        if (indexInNew === undefined) {
          // 如果新的里面找不到则说明老的有的要删除
          unmount(vnode)
        } else {
          newIndexToOldMapIndex[indexInNew - s2] = i // [4, 2, 3, 0]
          patch(vnode, vnodeList2[indexInNew] as VNode, el)
        }
      }
      console.log('中间的新的节点列表，在老节点中的位置，如果新出现的位置总是0', newIndexToOldMapIndex)

      const increasingSeq = getSequence(newIndexToOldMapIndex)
      console.log('LIS: ', increasingSeq)
      let j = increasingSeq.length - 1 // 索引

      // 5.3 上面虽然将老的更新了， 但是顺序可能不对， 而且还可能还有新建的元素
      for (let i = toBePatchedLength - 1; i >= 0; i--) {
        const index = s2 + i // [e d c h]倒序在vnodeList2中的下标
        const anchor = (vnodeList2[index + 1] as VNode)?.el
        const vnode = vnodeList2[index] as VNode
        if (!vnode.el) {
          // 如果vnode.el不存在，就说明这个vnode是新建的，还从来没有渲染到页面中。那么就插入
          patch(null, vnode, el, anchor)
        } else {
          if (i === increasingSeq[j]) {
            // 做了diff算法的优化.
            j--
          } else {
            // 如果vnode.el存在，说明在上一步中已经patch了，这时候就移动它的位置
            hostInsert(vnode.el, el, anchor) // 底层的insertBefore()会判断给定的节点是否已经存在于文档中， 如果是，则会将其从当前位置移动到新位置。所以这个方法也能当move用
          }
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
      // _vnode保存上次的vnode， 做对比用。  vnode.el和container._vnode互为引用
      container._vnode = vnode
    }
  }

  return {
    render,
  }
}
