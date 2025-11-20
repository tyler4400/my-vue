import { Fragment, Text } from './createVnode'
import { SchedulerJob } from './scheduler'
import { LifecycleHooks } from './enums'
import { Ref } from '@vue/reactivity3.4'

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
export type MountChildrenFn = (
  children: VNodeArrayChildren,
  container: HostElement,
  parentComponent: ComponentInternalInstance,
) => void
export type RenderFunction = () => VNodeChild

// 先提供简化的VNode类型定义，后面再优化
export interface VNode {
  type: VNodeTypes
  props: VNodeProps
  children: VNodeArrayChildren | InternalSlots | string | null
  __v_isVnode: true
  key: PropertyKey | null // diff算法需要用到的key
  el: HostNode | null // DOM 虚拟节点对应的真实节点
  shapeFlag: number
  component: ComponentInternalInstance | null // 组件实例， 和instance.vnode互为引用
  ref: VNodeRef
  target: HostElement | null // teleport target
}

export type Data = Record<string, any>

export type VNodeTypes =
  | string
  | VNode
  | Component
  | FunctionalComponent
  | 'ClassComponent'
  | typeof Text
  | 'Static'
  | 'Comment'
  | typeof Fragment
  | 'Teleport'
  | 'TeleportImpl'
  | 'Suspense'
  | 'SuspenseImpl'

export interface FunctionalComponent {
  (props: Data, ctx: Omit<SetupContext, 'expose'>): any
}

export type VNodeProps = {
  key?: PropertyKey
  ref?: VNodeRef
  ref_for?: boolean
  ref_key?: string
} & Data

export type VNodeRef =
  | string
  | Ref
  | ((ref: Element | 'ComponentPublicInstance' | null, refs: Record<string, any>) => void)

export type VNodeArrayChildren = Array<'VNodeArrayChildren' | VNodeChildAtom>
export type VNodeChildAtom = VNode | string | number | boolean | null | undefined | void
export type VNodeChild = VNodeChildAtom | VNodeArrayChildren

// 选项式组件基本构成
export type Component = {
  data: () => object
  render: (proxy: State) => VNode
  props: Record<string, any>
  setup: (props: Data, ctx: SetupContext) => Promise<'RawBindings'> | Data | RenderFunction | void
}

export type State = any

export interface ComponentInternalInstance {
  data: State
  vnode: VNode
  next: VNode | null // The pending new vnode from parent updates
  subTree: VNode // 组件的render函数所产生的vnode
  isMounted: boolean
  update: SchedulerJob
  propsOptions: Record<string, any> // 组件的props声明
  setupState: Data
  props: Data
  attrs: Data
  slots: InternalSlots

  proxy?: any | null | 'ComponentPublicInstance' // main proxy that serves as the public instance (`this`)
  render: Component['render']
  exposed: Data
  [LifecycleHooks.BEFORE_CREATE]: LifecycleHook
  [LifecycleHooks.CREATED]: LifecycleHook
  [LifecycleHooks.BEFORE_MOUNT]: LifecycleHook
  [LifecycleHooks.MOUNTED]: LifecycleHook
  [LifecycleHooks.BEFORE_UPDATE]: LifecycleHook
  [LifecycleHooks.UPDATED]: LifecycleHook
  [LifecycleHooks.BEFORE_UNMOUNT]: LifecycleHook
  [LifecycleHooks.UNMOUNTED]: LifecycleHook
  [LifecycleHooks.RENDER_TRACKED]: LifecycleHook
  [LifecycleHooks.RENDER_TRIGGERED]: LifecycleHook
  [LifecycleHooks.ACTIVATED]: LifecycleHook
  [LifecycleHooks.DEACTIVATED]: LifecycleHook
  [LifecycleHooks.ERROR_CAPTURED]: LifecycleHook
  [LifecycleHooks.SERVER_PREFETCH]: LifecycleHook<() => Promise<unknown>>
  provides: Record<PropertyKey, any>
  parent: ComponentInternalInstance | null
}

export interface SetupContext {
  attrs: Data
  slots: InternalSlots
  emit: EmitFn
  expose: (value: any) => void
}

export type Slot = (...args: any[]) => VNode[]

export type InternalSlots = {
  [name: string]: Slot | undefined
}

export interface EmitFn {
  (event: string, ...args: any[]): any
}

export type LifecycleHook<TFn = Function> = (TFn & SchedulerJob)[] | null
