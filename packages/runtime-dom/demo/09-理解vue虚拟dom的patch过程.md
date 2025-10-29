# 理解vue虚拟dom的patch过程
_Exported on 2025/10/29 at GMT+8 23:39:33 from Cursor (1.7.44)_

---

**User**

我理解vue中的虚拟dom会在patch完后，统一将更新后的dom插入到真实dom中，但是感觉我现在学习的代码是patch一部分的时候就会插入一部分，而不是最终一起插入@renderer.ts @createVnode.ts @h.ts @src/ @runtime-core/ 

---

**Cursor**

### 先说结论
- 你看到的“patch 一部分就插入一部分”的行为，是 Vue 运行时正确且刻意的设计。Vue 3 在客户端渲染时采用“增量/流式”挂载与更新：每个子树准备好后立刻通过 `hostInsert` 插入（或移动）到真实 DOM，不会在整个子树 patch 完成后再“统一一次性插入”。
- “统一批量”的概念更多来自：响应式调度（把多次状态变更合并到一个 flush）、SSR 的静态内容一次性插入、或某些库在初次挂载时使用 `DocumentFragment` 聚合。但 Vue 的常规客户端 patch 过程并不会收集整棵子树到内存中最后再 commit 一次。

### 现有代码为何是“增量插入”
几个关键位置可以直接看出“边 patch 边插入/移动”：

```74:98:packages/runtime-core/src/renderer.ts
const mountElement = (vnode: VNode, container: HostElement, anchor: HostNode) => {
  const { type, children, props, shapeFlag } = vnode
  const el = hostCreateElement(type as string)
  vnode.el = el
  if (props) {
    for (const key in props) {
      hostPatchProp(el, key, null, props[key])
    }
  }
  if (isTextChildren(shapeFlag)) {
    hostSetElementText(el, children as string)
  } else if (isArrayChildren(shapeFlag)) {
    mountChildren(children as VNodeArrayChildren, el)
  }
  hostInsert(el, container, anchor) // ← 这里立即插入
}
```

```54:61:packages/runtime-core/src/renderer.ts
const mountChildren: MountChildrenFn = (children, container) => {
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    patch(null, child as VNode, container) // ← 子节点也是逐个 mount，并各自插入
  }
}
```

```386:393:packages/runtime-core/src/renderer.ts
} else {
  if (i === increasingSeq[j]) {
    j--
  } else {
    hostInsert(vnode.el, el, anchor) // ← diff 阶段的移动也即时执行
  }
}
```

另外，接口预留了“静态内容一次性插入”的能力（常用于 SSR/静态片段），但当前实现未走这条路径：

```28:35:packages/runtime-core/src/types.ts
insertStaticContent?(
  content: string,
  parent: HostElement,
  anchor: HostNode | null,
  start?: HostNode | null,
  end?: HostNode | null,
): [HostNode, HostNode]
```

### 为什么这样设计是合理的
- 增量插入更贴合有“锚点”的插入语义（anchor），尤其是列表 diff 时的移动与定位。
- 现代浏览器会将同一帧内的多次插入/样式计算尽可能合并，配合 Vue 的异步调度，实际开销已很低。
- 真正需要“一次性”批量的场景通常在 SSR 静态段落或包含大量静态节点的模板中，Vue 会选择性使用 `insertStaticContent` 做优化。

---

## 如果你坚持要“初次挂载统一插入”，这里有两种可选方案
说明：两种方案都只改变“首次挂载（mount）”的行为，更新（patch existing）仍保持即时移动/更新，避免破坏 diff 语义。

### 方案 A（较少侵入，推荐优先尝试）：队列化首次挂载的插入
思路：在首次 `render` 时，暂存 “插入操作” 到队列，等整棵树 patch 完成后统一 flush 执行。更新阶段则不走队列，继续即时。

伪代码（关键数据结构/流程）：
```ts
// renderer 内部
const commitQueue: Array<() => void> = []
let isBatchingInitialMount = false

const enqueueInsert = (op: () => void) => {
  if (isBatchingInitialMount) commitQueue.push(op)
  else op()
}

// 替换所有首次挂载路径的 hostInsert 调用：
// 原：hostInsert(el, container, anchor)
// 新：enqueueInsert(() => hostInsert(el, container, anchor))

// render 中包裹首次挂载
if (!container._vnode && vnode) {
  isBatchingInitialMount = true
  patch(null, vnode, container)
  // 统一提交
  for (const job of commitQueue) job()
  commitQueue.length = 0
  isBatchingInitialMount = false
} else {
  patch(container._vnode, vnode, container)
}
```
权衡：
- 优点：不改动类型/节点层级，风险小；只影响首次 mount；实现简单。
- 缺点：严格意义上仍是“多次 insert”，只是集中到 flush 时统一执行，但“感知上”达到了你说的“不是边 patch 边插”的目标。

验证/回归点：
- 新增 demo：打印 `nodeOps.insert` 次数与时机。首次渲染应集中在 flush 后输出；二次更新保持原行为。
- 列表 diff（含移动）在更新阶段不走队列，应正常工作。

### 方案 B（真正一次性插入）：首次挂载改为构建 DocumentFragment
思路：首次挂载时，以 `DocumentFragment` 作为“临时容器”完成整棵子树的 patch，然后一次性把 fragment 插入到真实容器。

伪代码（关键点）：
```ts
// render 内部
if (!container._vnode && vnode) {
  const frag = document.createDocumentFragment()
  // 需要让 patch/insert 接受 frag 作为“父”；当前类型 HostElement = Element，不包含 Fragment
  patch(null, vnode, frag as any)
  container.insertBefore(frag, null) // 真正的一次插入
} else {
  patch(container._vnode, vnode, container)
}
```
权衡：
- 优点：容器层面是真正“一次性插入”，对 layout/paint 友好。
- 缺点：类型系统需要改 `HostElement`（Element → Node/ParentNode），属于“公共类型/行为语义变更”；需要逐个审查 `nodeOps.parentNode/nextSibling` 等地方的返回类型与调用者假设。根据你的仓库规则，这属于“跨包 API/公共类型变更”，需要先确认。

验证/回归点：
- 首次渲染 `container.insertBefore` 仅被调用一次。
- 递归 children/Fragment/文本节点挂载正常，因为它们插入到 fragment。
- 更新阶段（含 keyed diff 移动）保持原行为。

---

## 建议
- 学习阶段建议保持当前“增量插入”的实现（就是 Vue 真实的客户端行为），再配合注释理解 anchor 与移动的语义。如果你只是希望“看起来不要边 patch 边插”，优先试“方案 A”，不触碰公共类型，最稳。
- 确实需要“真正一次性插入”的对比实验，可在独立分支尝试“方案 B”，但请先确认允许变更 `HostElement` 类型。

---

## 需要你的确认
请告知你希望我落实哪一个方案：
- 保持现状，仅补充注释与一个对比 demo？
- 实施方案 A（首次挂载队列化插入）？
- 实施方案 B（首次挂载使用 DocumentFragment，一次性插入）？这需要调整公共类型，按你的仓库规则需先确认。

我收到确认后会按你的选择提交“方案、带中文注释的实现代码、验证 demo 与期望输出”，并遵循你的提交规范。 

- 我补充说明：若选择实现，我会在 `packages/runtime-core/src/renderer.ts` 中最小改动地封装插入点位，保证 diff（尤其 keyed 移动）不受影响。 

- 若仅需解释和理解帮助，也可以就此打住。 

- 也可以我先帮你做一个“小 demo”对比“现状 vs 批量”的插入次数与时机，便于你直观感受差异。

```typescript
const mountElement = (vnode: VNode, container: HostElement, anchor: HostNode) => {
  const { type, children, props, shapeFlag } = vnode
  const el = hostCreateElement(type as string)
  vnode.el = el
  if (props) {
    for (const key in props) {
      hostPatchProp(el, key, null, props[key])
    }
  }
  if (isTextChildren(shapeFlag)) {
    hostSetElementText(el, children as string)
  } else if (isArrayChildren(shapeFlag)) {
    mountChildren(children as VNodeArrayChildren, el)
  }
  hostInsert(el, container, anchor) // ← 这里立即插入
}
```

```typescript
const mountChildren: MountChildrenFn = (children, container) => {
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    patch(null, child as VNode, container) // ← 子节点也是逐个 mount，并各自插入
  }
}
```

```typescript
} else {
  if (i === increasingSeq[j]) {
    j--
  } else {
    hostInsert(vnode.el, el, anchor) // ← diff 阶段的移动也即时执行
  }
}
```

```typescript
insertStaticContent?(
  content: string,
  parent: HostElement,
  anchor: HostNode | null,
  start?: HostNode | null,
  end?: HostNode | null,
): [HostNode, HostNode]
```

```typescript
// renderer 内部
const commitQueue: Array<() => void> = []
let isBatchingInitialMount = false

const enqueueInsert = (op: () => void) => {
  if (isBatchingInitialMount) commitQueue.push(op)
  else op()
}

// 替换所有首次挂载路径的 hostInsert 调用：
// 原：hostInsert(el, container, anchor)
// 新：enqueueInsert(() => hostInsert(el, container, anchor))

// render 中包裹首次挂载
if (!container._vnode && vnode) {
  isBatchingInitialMount = true
  patch(null, vnode, container)
  // 统一提交
  for (const job of commitQueue) job()
  commitQueue.length = 0
  isBatchingInitialMount = false
} else {
  patch(container._vnode, vnode, container)
}
```

```typescript
// render 内部
if (!container._vnode && vnode) {
  const frag = document.createDocumentFragment()
  // 需要让 patch/insert 接受 frag 作为“父”；当前类型 HostElement = Element，不包含 Fragment
  patch(null, vnode, frag as any)
  container.insertBefore(frag, null) // 真正的一次插入
} else {
  patch(container._vnode, vnode, container)
}
```

