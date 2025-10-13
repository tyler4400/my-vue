import { HostElement } from '../types'
import { isString } from '@vue/shared'

type Style = string | Record<string, string | string[]> | null

// 所以为什么不直接替换？答： 因为还有很多默认样式
export function patchStyle(el: HostElement, prevValue: Exclude<Style, string>, nextValue: Style) {
  const style = (el as HTMLElement).style

  if (isString(nextValue)) {
    console.warn('字符串的style暂时会忽略', nextValue)
    return
  }

  // 遍历新样式，赋值到元素上，让新样式生效
  for (const key in nextValue) {
    style[key] = nextValue[key]
  }

  if (prevValue) {
    // 遍历旧样式
    // 看以前的属性，现在有没有，如果没有删除掉
    for (const key in prevValue) {
      if (!nextValue[key]) {
        style[key] = null
      }
    }
  }
}
