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

    /**
     * 根据 key 删除一条缓存：
     * 1. 从 cache / keys 中移除
     * 2. 将 vnode 上的 keepAlive 标记还原
     * 3. 走正常的 unmount 流程，真正移除 DOM 和组件实例
     *
     * 注意：这里传入的是 keepAlive 的当前实例作为父组件，
     * 因为 reset 之后不会再走 keepAlive 的失活逻辑，只会按普通组件卸载。
     */
    const pruneCacheEntry = (key: any) => {
      const cached = cache.get(key)
      if (!cached) return

      cache.delete(key)
      keys.delete(key)

      // 还原 vnode 上的 keepAlive 相关标记，否则无法按正常流程卸载
      reset(cached)
      // 真正做卸载，递归删除子组件和 DOM
      _unmount(cached, instance)
    }

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
        // 复用之前缓存的组件实例
        vnode.component = cachedVNode.component
        // mount的时候如果有这个标记，就不要走正常的mount流程，而是走激活流程。把家里藏（缓存）的dom拿出来
        vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE // 因为首次的时候没有cache，所以首次的不会走这里，正常mount

        // 命中缓存：将当前 key 移到 Set 的尾部，标记为最近使用（LRU）
        keys.delete(key)
        keys.add(key)
      } else {
        // ⚠️注意， 这不要添加cache, cache是在所有子组件挂载完后， 在本组件的onMounted的时候在添加到cache中的。
        // 如果这这里添加cache， 那么cache的value记录的是还没有真正mount的instance.subtree
        // 这里只记录添加了几次
        keys.add(key)
        if (max && keys.size > max) {
          // 缓存数量超过 max，淘汰最久未使用的那个 key
          const oldestKey = keys.values().next().value
          pruneCacheEntry(oldestKey)
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
