export interface RendererOptions {
  patchProp(
    el: HostElement,
    key: string,
    prevValue: any,
    nextValue: any,
    // namespace?: ElementNamespace,
    // parentComponent?: ComponentInternalInstance | null,
  ): void
  insert(el: HostNode, parent: HostElement, anchor?: HostNode | null): void
  remove(el: HostNode): void
  createElement(
    type: string,
    // namespace?: ElementNamespace,
    isCustomizedBuiltIn?: string,
    // vnodeProps?: (VNodeProps & { [key: string]: any }) | null,
  ): HostElement
  createText(text: string): HostNode
  createComment(text: string): HostNode
  setText(node: HostNode, text: string): void
  setElementText(node: HostElement, text: string): void
  parentNode(node: HostNode): HostElement | null
  nextSibling(node: HostNode): HostNode | null
  querySelector?(selector: string): HostElement | null
  setScopeId?(el: HostElement, id: string): void
  cloneNode?(node: HostNode): HostNode
  insertStaticContent?(
    content: string,
    parent: HostElement,
    anchor: HostNode | null,
    // namespace: ElementNamespace,
    start?: HostNode | null,
    end?: HostNode | null,
  ): [HostNode, HostNode]
}

export type HostNode = Node
export type HostElement = Element & {
  [key: string | symbol]: any
  // 保存上次的vnode， 做对比用
  _vnode?: VNode
}

export interface Renderer {
  render: RootRenderFunction
  createApp?: Function
}

export type RootRenderFunction = (vnode: VNode | null, container: HostElement) => void

// 先提供简化的VNode类型定义，后面再优化
export interface VNode {
  type: string
  props: Record<string, string>
  shapeFlag: number
  children: any
}

export type MountChildrenFn = (children: VNodeArrayChildren, container: HostElement) => void

type VNodeChildAtom = VNode | string | number | boolean | null | undefined | void
export type VNodeArrayChildren = Array<VNodeArrayChildren | VNodeChildAtom>
