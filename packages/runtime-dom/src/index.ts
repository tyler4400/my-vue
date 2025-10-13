import { RendererOptions } from './types'
import { nodeOps } from './nodeOps'
import { patchProp } from './patchProp'

export const renderOptions: RendererOptions = Object.assign({ patchProp }, nodeOps)

export function createRenderer() {}

// runtime-dom其实就是最终的vue包， 都在runtime-dom中导出的
export * from '@vue/reactivity3.4'
