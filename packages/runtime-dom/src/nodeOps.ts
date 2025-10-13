import { HostElement, HostNode, RendererOptions } from './types'

// 主要是对节点元素的增删改查
export const nodeOps: Omit<RendererOptions, 'patchProp'> = {
  /**
   * 如果第三个元素不传递. 则相当于是 appendChild（把一个节点附加到指定父节点的子节点列表的末尾处）
   * 否则就是insertBefore
   */
  insert(el: HostNode, parent: HostElement, anchor: HostNode | null | undefined): void {
    parent.insertBefore(el, anchor || null)
  },
  remove(el: HostNode): void {
    const parent = el.parentNode
    parent?.removeChild(el)
  },
  createElement(type: string): HostElement {
    return document.createElement(type)
  },
  createText(text: string): HostNode {
    return document.createTextNode(text)
  },
  setText(node: HostNode, text: string): void {
    node.nodeValue = text
  },
  setElementText(ele: HostElement, text: string): void {
    ele.textContent = text
  },
  parentNode(node: HostNode): HostElement | null {
    return node.parentElement
  },
  nextSibling(node: HostNode): HostNode | null {
    return node.nextSibling
  },
  createComment(text: string): HostNode {
    return document.createComment(text)
  },
}
