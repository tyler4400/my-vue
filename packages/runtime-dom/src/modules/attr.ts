import { HostElement } from '../types'

export const patchAttr = (el: HostElement, key: string, value: any) => {
  if (value) {
    el.setAttribute(key, value)
  } else {
    el.removeAttribute(key)
  }
}
