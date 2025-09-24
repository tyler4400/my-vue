// 用来保存当前正在执行的 effect
export let activeSub: Function

export function effect(fn: Function) {
  activeSub = fn
  activeSub()
  activeSub = undefined
}
