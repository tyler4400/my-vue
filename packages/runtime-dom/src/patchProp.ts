import { RendererOptions } from '@vue/runtime-core'
import patchClass from './modules/class'
import { patchAttr } from './modules/attr'
import { patchStyle } from './modules/style'
import patchEvent from './modules/event'

/**
 * 主要是对节点元素的属性操作 class style event 普通属性attr
 *
 * // el 是目标 DOM 元素节点，即你要操作的 HTML 元素。
 * // HTMLElement
 * // const el = document.createElement("div"); // <div></div>
 * // patchProp(el, "class", null, "my-class");
 * // 操作后 el => <div class="my-class"></div>
 *
 * // key：当前需要设置或更新的 属性名。
 * // 类型：string
 * // 作用：决定你要处理的是 class、style、事件（onClick）还是普通属性（id、title 等），patchProp 会根据这个值分发到不同的模块。
 * // patchProp(el, "style", null, { color: "red" });
 * // patchProp(el, "onClick", null, () => alert("clicked"));
 * // patchProp(el, "title", null, "hello");
 *
 * // prevValue：该属性 之前的值，也可以是 null。
 * // 类型：任意类型（string、object、function...）
 * // 作用：用于比较是否需要更新；如果旧值存在，新值为 null，则应清除旧值；对于样式和事件来说，特别重要。
 * // patchProp(el, "style", { color: "red" }, { color: "blue" });
 * // 旧值是 red，新值是 blue，会将 red 替换为 blue
 *
 * // nextValue：该属性的 新值
 * // 类型：任意类型（与属性类型对应）
 * // 作用：你希望这个属性最终变成什么值，就传什么；若为 null，表示要删除该属性。
 * // patchProp(el, "class", "old-class", "new-class");
 * // class 会从 "old-class" 变成 "new-class"
 * // patchProp(el, "onClick", oldFn, null);
 * // 表示解绑点击事件
 */
export const patchProp: RendererOptions['patchProp'] = (el, key, prevValue, nextValue) => {
  if (key === 'class') {
    return patchClass(el, nextValue)
  }
  if (key === 'style') {
    return patchStyle(el, prevValue, nextValue)
  }
  if (/^on[^a-z]/.test(key)) {
    return patchEvent(el, key, nextValue)
  }
  patchAttr(el, key, nextValue)
}
