### 问题
Node和Element有什么不同

- [MDN: Node](https://developer.mozilla.org/zh-CN/docs/Web/API/Node)
- [MDN: Element](https://developer.mozilla.org/zh-CN/docs/Web/API/Element)

### 核心结论
- **Element 是 Node 的子类型**：Element 专指“元素节点（标签）”，Node 是对 DOM 树中“所有节点”的抽象（文档、元素、文本、注释、片段等）。
- 因此 **Node 更泛化**、负责树结构与遍历；**Element 更具体**、提供元素属性/样式/选择器等能力。

### 继承关系（简化）
- EventTarget → Node → Element → HTMLElement/SVGElement…
- 同级：Document、DocumentFragment、Text、Comment 都是 Node，但不是 Element。

### API 差异速览
| 维度 | Node | Element |
|---|---|---|
| 范围 | 任意节点（文档/元素/文本/注释/片段…） | 仅元素节点（标签） |
| 类型判断 | `nodeType`（1=元素、3=文本、8=注释、9=文档、11=片段…） | `nodeType===1` 恒成立；`tagName` 可用 |
| 结构遍历 | `parentNode`、`childNodes`、`firstChild`、`previousSibling`…（包含文本/注释） | `children`、`firstElementChild`、`previousElementSibling`…（仅元素） |
| 集合类型 | `NodeList`（可含文本、注释） | `HTMLCollection`（仅元素） |
| 文本/HTML | `textContent` | `textContent`、`innerHTML`、`outerHTML` |
| 属性/类名 | 无 `attributes`/`classList`/`id`/`style` | 有 `attributes`、`get/setAttribute`、`classList`、`id`、`style`、`dataset` |
| 选择器 | Node 本身不保证有 | `querySelector(All)`（Element/Document/DocumentFragment 提供） |
| 几何布局 | 无 | `getBoundingClientRect` 等（在 Element/HTMLElement 上） |
| 创建 | `document.createTextNode` 返回 Text（Node） | `document.createElement` 返回 Element |

### 小例子：元素 vs 所有子节点
```html
<div id="box">a<span>b</span>c<!-- comment --></div>
<script>
const el = document.getElementById('box'); // Element

console.log(el.childNodes.length);       // 4（"a", <span>, "c", 注释）
console.log(el.children.length);         // 1（仅 <span>）
console.log(el.firstChild.nodeType);     // 3（TEXT_NODE）
console.log(el.firstElementChild.tagName); // "SPAN"

el.classList.add('active');              // OK（Element 专属）
console.log(el.textContent);             // 来自 Node，元素也可用
</script>
```

### 该用哪个？
- **只关心标签**：优先用 Element 的 API（`children`/`classList`/`getAttribute`）。
- **遍历/计算需要包含文本/注释**：用 Node 的 API（`childNodes`/`previousSibling`）。
- **类型守卫**：`if (node.nodeType === Node.ELEMENT_NODE) { const el = node as Element; … }` 或 `node instanceof Element`。
- **TypeScript**：需要属性/样式时标注为 `Element`/`HTMLElement`；泛化处理用 `Node`。

### 总结

- Element 继承 Node，前者面向“元素能力”（属性/样式/选择器/元素级遍历），后者面向“通用树结构”（包含文本、注释等全部节点类型）。
