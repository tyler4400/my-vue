import { RendererOptions, RootRenderFunction } from '@vue/runtime-core'
import { nodeOps } from './nodeOps'
import { patchProp } from './patchProp'
import { createRenderer } from '@vue/runtime-core'

export const renderOptions: RendererOptions = Object.assign({ patchProp }, nodeOps)

export const render: RootRenderFunction = (vnode, container) => {
  return createRenderer(renderOptions).render(vnode, container)
}

/**
 * runtime-dom其实就是最终的vue包， 都在runtime-dom中导出的
 * 依赖关系 runtime-dom -> runtime-core -> reactivity
 */
export * from '@vue/runtime-core'
