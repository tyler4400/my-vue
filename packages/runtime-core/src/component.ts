import { Component, ComponentInternalInstance, Data, VNode } from './types'
import { reactive } from '@vue/reactivity3.4'
import { hasOwn, isFunction } from '@vue/shared'

export function createComponentInstance(vNode: VNode) {
  const instance: ComponentInternalInstance = {
    data: null,
    vnode: vNode,
    subTree: null, // 子虚拟dom
    isMounted: false, // 组件是否挂载
    update: null, // 组件更新函数
    props: {}, // 传递给组件的props
    attrs: {},
    propsOptions: (vNode.type as Component).props, // 组件的props声明
    component: null,
    render: null,
    next: null, // The pending new vnode from parent updates
  }
  return instance
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
      // 用所有的来分裂
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
    const { props, data } = target
    if (hasOwn(data, key)) {
      return data[key]
    }
    if (hasOwn(props, key)) {
      return props[key as string]
    }

    const publicProperty = {
      $attrs: (instance: ComponentInternalInstance) => instance.attrs,
    }
    const getter = publicProperty[key]
    if (getter) {
      return getter(target)
    }
  },
  set(target, key, value) {
    const { props, data } = target
    if (hasOwn(data, key)) {
      data[key] = value
      return true
    }
    if (hasOwn(props, key)) {
      // 不可以修改属性中的嵌套属性,技术上可以做到但是不合理，所以从设计上不允许
      console.warn('props are readonly')
      // 在严格模式下，Proxy set trap 必须返回 true，否则会抛出 TypeError
      return true
    }
    // 其他情况（既不在 state 也不在 props），保持静默并返回 true，避免严格模式报错
    return true
  },
}

export function setupComponent(instance: ComponentInternalInstance) {
  const { vnode } = instance

  // 赋值属性
  initProps(instance, vnode.props)

  // 赋值代理对象
  instance.proxy = new Proxy(instance, handler)

  const { data, render } = vnode.type as Component

  if (!isFunction(data)) {
    console.error('data option must be a function')
    instance.data = {}
  } else {
    instance.data = reactive(data.call(instance.proxy))
  }

  instance.render = render
}
