import { Component, ComponentInternalInstance, Data, InternalSlots, LifecycleHook, SetupContext, VNode } from './types'
import { proxyRefs, reactive } from '@vue/reactivity3.4'
import { hasOwn, isFunction, isSlotsChildren, NOOP, toHandlerKey } from '@vue/shared'
import { LifecycleHooks } from './enums'

export function createComponentInstance(vNode: VNode) {
  const instance: ComponentInternalInstance = {
    data: null,
    vnode: vNode,
    subTree: null, // 子虚拟dom
    isMounted: false, // 组件是否挂载
    update: null, // 组件更新函数
    props: {}, // 传递给组件的props
    attrs: {},
    slots: {},
    propsOptions: (vNode.type as Component).props, // 组件的props声明
    render: null,
    next: null, // The pending new vnode from parent updates
    setupState: {},
    exposed: {},
    [LifecycleHooks.BEFORE_CREATE]: null,
    [LifecycleHooks.CREATED]: null,
    [LifecycleHooks.BEFORE_MOUNT]: null,
    [LifecycleHooks.MOUNTED]: null,
    [LifecycleHooks.BEFORE_UPDATE]: null,
    [LifecycleHooks.UPDATED]: null,
    [LifecycleHooks.BEFORE_UNMOUNT]: null,
    [LifecycleHooks.UNMOUNTED]: null,
    [LifecycleHooks.RENDER_TRACKED]: null,
    [LifecycleHooks.RENDER_TRIGGERED]: null,
    [LifecycleHooks.ACTIVATED]: null,
    [LifecycleHooks.DEACTIVATED]: null,
    [LifecycleHooks.ERROR_CAPTURED]: null,
    [LifecycleHooks.SERVER_PREFETCH]: null,
  }
  return instance
}

const initSlots = (instance: ComponentInternalInstance, children: InternalSlots) => {
  if (isSlotsChildren(instance.vnode.shapeFlag)) {
    instance.slots = children
  } else {
    instance.slots = {}
  }
}

/**
 * 当rawProps传递给组件时， 没有被组件的props声明的部分会成为attrs，声明的会成为props
 * attrs不是响应式的。attrs变化不会驱动视图更新，但若视图更新时，会拿最新的attrs值。
 *
 * 这就好比有护照的是合法移民props， 没有护照的就是非法移民attrs
 * @param instance
 * @param rawProps
 */
export const initProps = (instance: ComponentInternalInstance, rawProps: Data) => {
  const props = {}
  const attrs = {}
  const propsOptions = instance.propsOptions || {} // 组件中定义的

  if (rawProps) {
    for (const key in rawProps) {
      // 用options定义来区分props与attrs
      const value = rawProps[key]
      if (key in propsOptions) {
        props[key] = value
      } else {
        attrs[key] = value
      }
    }
  }

  instance.attrs = attrs
  instance.props = reactive(props) // readonlyReactive，props不需要深度代理，组件内不能改props
}

const handler: ProxyHandler<ComponentInternalInstance> = {
  get(target, key) {
    // data 和 props属性中的名字不应重名，检查就不写了
    const { props, data, setupState } = target
    if (hasOwn(data, key)) {
      return data[key]
    }
    if (hasOwn(props, key)) {
      return props[key as string]
    }
    if (hasOwn(setupState, key)) {
      return setupState[key as string]
    }

    const publicProperty = {
      $attrs: (instance: ComponentInternalInstance) => instance.attrs,
      $slots: (instance: ComponentInternalInstance) => instance.slots,
      // $emit: (instance: ComponentInternalInstance) => instance.emit,
    }
    const getter = publicProperty[key]
    if (getter) {
      return getter(target)
    }
  },
  set(target, key, value) {
    const { props, data, setupState } = target
    if (hasOwn(data, key)) {
      data[key] = value
      return true
    } else if (hasOwn(props, key)) {
      // 不可以修改属性中的嵌套属性,技术上可以做到但是不合理，所以从设计上不允许
      console.warn('props are readonly')
      // 在严格模式下，Proxy set trap 必须返回 true，否则会抛出 TypeError
      return true
    } else if (hasOwn(setupState, key)) {
      setupState[key as string] = value
    } else {
      // 其他情况（既不在 state 也不在 props），保持静默并返回 true，避免严格模式报错
      return true
    }
  },
}

export function setupComponent(instance: ComponentInternalInstance) {
  const { vnode } = instance

  // 赋值属性
  initProps(instance, vnode.props)

  initSlots(instance, vnode.children as InternalSlots)

  // 赋值代理对象
  instance.proxy = new Proxy(instance, handler)

  const { data = NOOP, render, setup } = vnode.type as Component

  if (setup) {
    const setupContext: SetupContext = {
      emit(event, ...payload) {
        const eventName = toHandlerKey(event) // 'click' -> 'onClick'
        const handler = instance.vnode.props[eventName]
        if (isFunction(handler)) handler?.(...payload)
      },
      attrs: instance.attrs,
      slots: instance.slots,
      expose: (value: any) => {
        instance.exposed = value
      },
    }

    setCurrentInstance(instance)
    const setupResult = setup(instance.props, setupContext)
    unsetCurrentInstance()

    if (isFunction(setupResult)) {
      instance.render = setupResult as Component['render']
    } else {
      instance.setupState = proxyRefs(setupResult as Data) // 将返回值做脱ref
    }
  }

  if (!isFunction(data)) {
    console.warn('data option must be a function')
    instance.data = {}
  } else {
    instance.data = reactive(data.call(instance.proxy))
  }

  if (!instance.render) {
    // 避免覆盖setup中的render. setup返回的render优先级更高
    instance.render = render
  }
}

export let currentInstance: ComponentInternalInstance = null
export const getCurrentInstance = () => {
  return currentInstance
}
export const setCurrentInstance = instance => {
  currentInstance = instance
}
export const unsetCurrentInstance = () => {
  currentInstance = null
}
