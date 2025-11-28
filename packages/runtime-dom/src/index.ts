import { RendererOptions, RootRenderFunction } from '@vue/runtime-core'
import { nodeOps } from './nodeOps'
import { patchProp } from './patchProp'
import { createRenderer } from '@vue/runtime-core'
import { isString } from '@vue/shared'

/**
 * runtime-dom其实就是最终的vue包， 都在runtime-dom中导出的
 * 依赖关系 runtime-dom -> runtime-core -> reactivity
 */
export * from '@vue/runtime-core'

export const renderOptions: RendererOptions = Object.assign({ patchProp }, nodeOps)

const renderer = createRenderer(renderOptions)
export const render: RootRenderFunction = (vnode, container) => {
  return renderer.render(vnode, container)
}

export function createApp(rootComponent, rootProps) {
  const app = renderer.createApp(rootComponent, rootProps)
  const _mount = app.mount.bind(app)
  /**
   * 重写 app mount，使用dom查询获取到元素
   */
  function mount(selector) {
    let el = selector
    if (isString(selector)) {
      el = document.querySelector(selector)
    }
    _mount(el)
  }

  app.mount = mount

  return app
}
