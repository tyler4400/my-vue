import { Component, VNode } from '../types'
import { isComponentKeptAlive, isComponentShouldKeepAlive, ShapeFlags } from '@vue/shared'
import { getCurrentInstance } from '../component'
import { onMounted, onUpdated } from '../apiLifecycle'

export const KeepAlive: Component = {
  __isKeepAlive: true,
  props: {
    max: Number,
  },
  setup(props, { slots }) {
    const { max } = props
    // 缓存每一次update或者mount变化时的xx  <keep-alive <xx> <keep-alive>
    const cache = new Map<any, VNode>()

    // 记录缓存个数， 做LRU
    const keys = new Set<any>()

    const instance = getCurrentInstance()
    const { move, unmount: _unmount, createElement } = instance.ctx.renderer

    instance.ctx.activate = (vnode, container, anchor) => {
      move(vnode, container, anchor) // 将元素拿出来
    }
    const storageContent = createElement('div')
    instance.ctx.deactivate = vnode => {
      // 把元素藏起来
      move(vnode, storageContent, null)
    }

    // 初始mount和每次更新时， 记录刷新cache的内容
    let pendingCacheKey = null
    const cacheSubTree = () => cache.set(pendingCacheKey, instance.subTree)
    onMounted(cacheSubTree)
    onUpdated(cacheSubTree)

    return () => {
      const vnode = slots.default()

      // 缓存的key是vnode的key或type
      const key = vnode.key || vnode.type
      pendingCacheKey = key
      const cachedVNode = cache.get(key)
      if (cachedVNode) {
        vnode.component = cachedVNode.component
        // mount的时候如果有这个标记，就不要走正常的mount流程，而是走激活流程。把家里藏（缓存）的dom拿出来
        vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE // 因为首次的时候没有cache，所以首次的不会走这里，正常mount
      } else {
        // ⚠️注意， 这不要添加cache, cache是在所有子组件挂载完后， 在本组件的onMounted的时候在添加到cache中的。
        // 如果这这里添加cache， 那么cache的value记录的是还没有真正mount的instance.subtree
        // 这里只记录添加了几次
        keys.add(key)
        if (max && keys.size > max) {
          // 做LRU
          console.log('lru')
        }
      }
      // unmount的时候如果有这个标记， 就不要走正常的卸载流程，而是使用move，把这些内容放到家里深处
      vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
      return vnode
    }
  },
}

export const isKeepAlive = (vnode: any) => vnode?.type?.__isKeepAlive

function reset(vnode: VNode) {
  let shapeFlag = vnode.shapeFlag
  // 1 | 4 = 5      5 -1 = 4
  if (isComponentKeptAlive(shapeFlag)) {
    shapeFlag -= ShapeFlags.COMPONENT_KEPT_ALIVE
  }
  if (isComponentShouldKeepAlive(shapeFlag)) {
    shapeFlag -= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
  }
  vnode.shapeFlag = shapeFlag
}

// function purneCacheEntry(key, unmount: (vnode: VNode) => void) {
//   keys.delete(key)
//   const cached = cache.get(key) // 之前缓存的结果
//   // 还原vnode上的标识，否则无法走移除逻辑
// 	reset(cached) // 将vnode标识去除
// 	unmount(cached) // 真正的做删除
// }
