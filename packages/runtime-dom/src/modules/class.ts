import { HostElement } from '@vue/runtime-core'

export default function patchClass(el: HostElement, value: any) {
  if (!value) {
    el.removeAttribute('class')
  } else {
    el.setAttribute('class', value)
  }
}
