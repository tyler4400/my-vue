import { VNodeArrayChildren, VNodeProps, VNodeTypes } from './types'
import { createVnode, isVnode } from './createVnode'

import { isArray, isObject } from '@vue/shared'

/**
 * h方法创建一个虚拟dom （type，propsOrChildren,children）
 *
 * 1个参数 类型
 * 2个参数 类型, 属性/儿子
 * 3个参数 类型, 属性, 儿子
 * h(类型,属性,儿子)
 * h(类型,儿子)
 *
 * 1 两个参数第二个参数可能是属性或者虚拟节点(__v_isVnode)
 * 2 第二个参数就是一个数组 -> 儿子
 * 3 其他情况就是属性
 * 4 直接传递非对象的, 文本
 * 5 不能出现3个参数的时候,第二个不是属性
 * 6 如果超过3个参数,后面的都是儿子
 */
export function h(type: VNodeTypes, propOrChildren?: any, children?: any) {
  const len = arguments.length

  let _children: VNodeArrayChildren | string | null = null
  let _props: VNodeProps = null

  if (len === 2) {
    if (isObject(propOrChildren) && !isArray(propOrChildren)) {
      // 第二个参数是对象，且不是数组。要么就是属性props，要么就是标记的vnode
      if (isVnode(propOrChildren)) {
        _children = [propOrChildren] // 说明是vnode，也就是children
      } else {
        _props = propOrChildren // 说明是属性props
      }
    } else {
      // 说明第二个参数是 数组｜文本. 那就是属于children了
      _children = propOrChildren
    }
  }
  if (len === 3) {
    _props = propOrChildren
    _children = isVnode(children) ? [children] : children
  }
  if (len > 3) {
    _props = propOrChildren
    // eslint-disable-next-line prefer-rest-params
    _children = Array.from(arguments).slice(2)
  }

  return createVnode(type, _props, _children)
}
