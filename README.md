## vue3.4 源码学习项目（配套 B 站课程）

> 本仓库**主学习对象是 Vue 3.4** 的核心源码实现，对应的响应式模块为 `@vue/reactivity3.4`；  
> 同时提供 **Vue 3.5 响应式实现对比版本** `@vue/reactivity`，方便你在 3.4 与 3.5 之间做行为与实现细节的对照学习。

---

## 一、项目简介

### 1.1 项目背景

本仓库是一个 **Vue3 内部实现与源码结构的学习项目**，主要配套以下 B 站课程使用：

- 课程名称：**[2025最新版 Vue3.4 核心源码解析教程（全65集）](https://www.bilibili.com/video/BV1zBc2e4EaZ)**

目标是通过拆分与仿写 Vue 官方仓库中的几个核心子模块（`reactivity`、`runtime-core`、`runtime-dom`、`compiler-core` 等），从零构建出一个可运行的 mini Vue3.4，实现从「会用 Vue」到「读得懂源码」的过渡。

### 1.2 项目特点

- **对齐 Vue 3.4 源码结构**：子包命名与官方仓库保持高度一致，方便一一对照。
- **3.4 & 3.5 双版本响应式系统**：
  - `@vue/reactivity3.4`：主学习版本，对标 Vue 3.4。
  - `@vue/reactivity`：参考/对照版本，对标 Vue 3.5 部分实现差异。
- **配套 HTML Demo**：各子包下提供 `demo/*.html` 或 `example/*.html`，可以直接浏览器打开，观察真实运行效果。
- **中文注释 & 学习导向**：代码和注释以「解释为什么」为主，而不是简单还原源码，方便自学与复习。

---

## 二、学习资源与参考

### 2.1 主视频课程

- B 站：`https://www.bilibili.com/video/BV1zBc2e4EaZ`
- 建议学习方式：
  1. 先看课程中讲解的模块。
  2. 在本仓库中找到对应包与 `demo`。
  3. 对照课程讲解，亲自跑一遍 demo 和源码。

### 2.2 官方资源（建议对照阅读）

- Vue 官方文档（3.x）
- Vue 官方源码仓库（vuejs/core）

建议做法：

- 将本仓库当作「精简 + 注释版」实现；  
- 将官方仓库当作「完整版」参考实现。  

遇到不理解的地方，可以：

1. 先看本仓库的实现逻辑和中文注释；
2. 再去官方仓库中搜索相同文件/函数名称，感受工业级实现的细节。

### 2.3 本仓库定位

- **学习 / 教学用途优先**：不推荐直接用于生产环境。
- 更关注：
  - 概念是否清晰；
  - 调用链是否好追踪；
  - 是否方便打断点 / 打 log 理解。

---

## 三、整体架构与包关系总览

本项目使用 **pnpm workspace** 管理多个子包，整体结构与 Vue 官方仓库类似。

### 3.1 顶层常用脚本（根目录 `package.json`）

- `pnpm run dev:reactivity`：开发/构建 `@vue/reactivity` 包（3.5 版响应式）。
- `pnpm run dev:reactivity3.4`：开发/构建 `@vue/reactivity3.4` 包（3.4 版响应式，主学习对象）。
- `pnpm run dev:runtime-dom`：开发/构建 `@vue/runtime-dom`。
- `pnpm run dev:compiler-core`：开发/构建 `@vue/compiler-core`。
- `pnpm run format` / `pnpm run format:check`：使用 Prettier 统一格式化。
- `pnpm run lint`：使用 ESLint 做代码检查（学习项目，可按需使用）。

### 3.2 包依赖关系概览（文字版依赖图）

从底层工具到上层运行时，大致依赖关系如下：

- `@vue/shared`
  - 定位：跨模块共享的工具函数与常量（例如类型判断、PatchFlags、ShapeFlags 等）。
  - 被其它所有核心包依赖。
- `@vue/reactivity3.4`
  - 依赖：`@vue/shared`
  - 用途：Vue 3.4 响应式系统实现（主学习版本）。
- `@vue/reactivity`
  - 依赖：`@vue/shared`
  - 用途：Vue 3.5 响应式系统对照实现（用于与 3.4 进行差异比较）。
- `@vue/runtime-core`
  - 依赖：`@vue/reactivity3.4`、`@vue/shared`
  - 用途：组件系统、虚拟 DOM、调度器等与平台无关的运行时核心逻辑。
- `@vue/runtime-dom`
  - 依赖：`@vue/runtime-core`、`@vue/shared`
  - 用途：浏览器 DOM 平台相关实现，如真实 DOM 操作、事件、属性、样式等。
- `vue`
  - 依赖：运行时核心等（根据实际实现聚合导出）。
  - 用途：模拟官方 `vue` 包，对外作为统一入口。

你可以把它想象成一个「从下到上」的洋葱结构：

> shared（基础工具） → reactivity（响应式） → runtime-core（组件与渲染核心） → runtime-dom（平台适配） → vue（对外统一入口）

---

## 四、子模块一览与说明（packages）

### 4.1 `packages/shared` — 工具函数层

- **包名**：`@vue/shared`
- **作用**：
  - 提供字符串、对象、数组等通用工具函数；
  - 定义 `ShapeFlags`、`PatchFlags` 等在渲染流程中广泛使用的标志位；
  - 被响应式系统、runtime、compiler 等所有模块复用。
- **目录结构示例**：
  - `src/index.ts`：统一导出 shared 模块对外 API。
  - `src/utils.ts`：通用工具函数，如类型判断、对象合并等。
  - `src/shapeFlags.ts`：用于区分 vnode 类型（组件 / 文本 / Fragment 等）。
  - `src/patchFlags.ts`：用于编译优化 patch 流程的标记位。

建议先快速浏览 `shared`，理解所有「小工具」的用途，后面读其它模块时会轻松很多。

### 4.2 `packages/reactivity3.4` — Vue 3.4 响应式系统（主学习版本）

- **包名**：`@vue/reactivity3.4`
- **定位**：本项目的 **核心学习对象之一**，重点参考 Vue 3.4 的实现。
- **功能范围**：
  - `effect`：副作用函数的收集与触发。
  - `reactive`：对象的深度代理。
  - `ref` / `shallowRef`：值类型与浅层响应式封装。
  - `computed`：计算属性的依赖追踪与缓存。
  - `watch` / `watchEffect`：侦听器能力与边界处理。
- **关键源码文件**（位于 `src/`）：
  - `reactive.ts`：`reactive`、`readonly` 等入口，创建代理对象。
  - `effect.ts`：`effect` 核心实现，依赖收集、触发与调度器（scheduler）。
  - `reactiveEffect.ts`：`ReactiveEffect` 类的封装，管理依赖桶、执行栈等细节。
  - `ref.ts`：实现 `ref`、`shallowRef` 及与 `reactive` 之间的互操作。
  - `computed.ts`：实现惰性求值 + 缓存失效的计算属性。
  - `watch.ts`：实现 `watch` / `watchEffect`，包括依赖清理与调度策略。
  - `baseHandler.ts`：Proxy 的 handler 集合，实现 get/set/has 等拦截逻辑。
  - `constants.ts` / `types.ts`：常量与类型定义。
- **Demo 列表（`demo/*.html`）**：
  - `01-基本边界条件验证.html`
  - `02-effect.html`
  - `03-effect的依赖清理.html`
  - `04-调度器.html`
  - `05-依赖清理bug.html`
  - `06-effect递归调用陷阱.html`
  - `07-深度代理.html`
  - `08-ref.html`
  - `09-ref转换.html`
  - `10-computed实现.html`
  - `11-watch实现.html`
  - `12-watchEffect.html`
  - `13-watch增强.html`

这些 demo 基本覆盖了课程中所有关键知识点，建议边看视频边跑这些 demo。

### 4.3 `packages/reactivity` — Vue 3.5 响应式系统（对比版本）

- **包名**：`@vue/reactivity`
- **定位**：**Vue 3.5 版本的响应式实现，对照版本**。
- **作用**：
  - 与 `@vue/reactivity3.4` 功能大体一致，但在某些边界处理、性能优化策略等方面与 3.4 有差异。
  - 方便在学习完 3.4 实现后，升级对照到 3.5，理解框架演进思路。
- **关键源码文件（`src/`）**：
  - `effect.ts`：3.5 版 effect 实现。
  - `ref.ts`：3.5 版 ref 实现。
  - `system.ts`：整体响应式系统相关的封装与导出。
- **Example 列表（`example/*.html`）**：
  - `01-响应式最基础实现.html`
  - `02-链表.html`

可以把这里视为一个「实验场」，用于尝试 3.5 中新的实现方式或行为差异。

### 4.4 `packages/runtime-core` — 渲染核心 & 组件系统

- **包名**：`@vue/runtime-core`
- **作用**：
  - 提供与平台无关的渲染逻辑：虚拟 DOM、diff / patch 算法。
  - 实现组件实例生命周期、props/slots、依赖注入（provide/inject）等。
  - 通过「渲染器（renderer）」将 vnode 树转成真实平台节点。
- **关键源码文件（`src/`）**：
  - `renderer.ts`：渲染器核心实现，包含 `patch`、`patchChildren`、`processComponent` 等。
  - `component.ts`：组件实例的创建、挂载、更新逻辑。
  - `h.ts`：`h()` 函数实现，用于方便创建 vnode。
  - `scheduler.ts`：更新调度策略，实现 nextTick、队列等逻辑。
  - `apiLifecycle.ts`：onMounted、onUpdated 等生命周期 API。
  - `apiProvide.ts`：provide / inject 相关 API。
  - `types.ts` / `enums.ts`：类型与枚举定义。
  - `components/KeepAlive.ts`：内置 KeepAlive 组件实现。
  - `components/Teleport.ts`：内置 Teleport 组件实现。
  - `components/Transition.ts`：内置 Transition 组件实现。
- **demo / 实验代码**：
  - `demo/01-最长递增子序列LIS.ts`：与 diff 算法优化相关的 LIS 实现，理解列表更新性能优化。

建议在掌握响应式系统之后，再来深入阅读 runtime-core，会更容易理解「响应式数据是如何驱动 UI 更新」的。

### 4.5 `packages/runtime-dom` — DOM 渲染 & 平台相关适配

- **包名**：`@vue/runtime-dom`
- **作用**：
  - 将 `runtime-core` 的平台无关渲染逻辑，适配到浏览器 DOM 环境。
  - 负责真实 DOM 的创建/更新/销毁，事件绑定、属性设置、样式处理等。
- **关键源码文件（`src/`）**：
  - `index.ts`：`createApp` 等对外入口，与官方 `createApp` 用法类似。
  - `nodeOps.ts`：对原生 DOM 操作进行封装，如 `insert`, `remove`, `createElement` 等。
  - `patchProp.ts`：统一处理属性更新，内部再分发到 attr/class/style/event 等模块。
  - `modules/attr.ts`：DOM 属性更新逻辑。
  - `modules/class.ts`：class 切换与合并逻辑。
  - `modules/style.ts`：内联样式的 diff 与更新。
  - `modules/event.ts`：事件绑定与更新（如缓存事件处理函数，避免多次绑定等）。
- **Demo 列表（`demo/*.html`）**（部分举例）：
  - `01-原vue中的用法.html`
  - `02-renderOptions对比.html`
  - `03-createRenderer对比.html`
  - `04-H方法.html`
  - `05-patchChildren对比.html`
  - `06-patchKeyedChildren方法对比.html`
  - `08-process各种情形.html`
  - `09-组件的渲染.html` ~ `11-组件的渲染3.html`
  - 以及图解资源 `assets/*.png` 帮助理解 diff 行为。

这些 demo 非常适合配合 DevTools 观察：vnode 结构 → patch 流程 → DOM 变化。

### 4.6 `packages/compiler-core` — 模板编译核心

- **包名**：`@vue/compiler-core`
- **作用**：
  - 将模板字符串编译成渲染函数（render function）。
  - 包含：词法/语法解析（parse）、AST 构建与转换、代码生成等步骤。
- **关键源码文件（`src/`）**：
  - `parser.ts`：将模板解析为 AST 的核心逻辑。
  - `ast.ts`：AST 节点类型与结构定义。
  - `index.ts`：对外暴露编译入口，例如 `baseCompile`。
  - `runtime-helpers.ts`：编译过程中使用的运行时 helper 列表。
- **Demo（`demo/*.html`）**：
  - `01-compile.html`：演示从模板到最终代码的完整编译过程。
  - `02-parse.html`：侧重展示 parse 阶段生成的 AST 结构。

阅读建议：

1. 先在浏览器中打开 `01-compile.html`，观察简单模板的编译产物；
2. 再回到 `parser.ts` / `ast.ts` 中跟踪节点是如何被创建和遍历的。

### 4.7 `packages/vue` — 聚合核心包

- **包名**：`vue`
- **作用**：
  - 模拟官方 `vue` 包的入口，对外统一暴露 runtime / reactivity 等核心能力。
  - 方便在 demo 或其它实验项目中通过 `vue` 这个入口来使用。
- **关键源码文件**：
  - `src/index.ts`：聚合导出，例如：`createApp`、`reactive`、`ref` 等（以实际实现为准）。

可以把这个包理解为「对外门面」，内部能力由上面几个子模块提供。

### 4.8 `docs` — 学习文档与笔记

- **目录位置**：根目录 `docs/`
- **用途**：
  - 记录课程中的关键知识点与个人理解；
  - 对某些 API / 概念做更详细的图文说明。
- **示例文档**：
  - `01-Node和Element的区别.md`：浏览器 DOM 基础，理解 Node 与 Element 的细微差别。
  - `1.理解receiver.md`：解释 Proxy handler 中 `receiver` 的意义，帮助理解响应式系统的 this 绑定行为。
  - `pnpm-monorepo-搭建手册.md` / `pnpm-monorepo-命令手册.md`：记录 monorepo 相关知识与操作。
  - `课程文档-vue3源码解析.md`：课程相关大纲或学习记录。

建议按需阅读这些文档，遇到卡住的概念可以先翻翻这里。

---

## 五、快速开始（Getting Started）

### 5.1 环境准备

- 建议 Node.js 版本：**>= 18**（与当前工具链兼容性更好）。
- 包管理工具：**pnpm**（推荐全局安装）。

安装 pnpm（任选其一）：

- 使用 corepack：`corepack enable`，然后直接使用 `pnpm`。
- 或全局安装：`npm install -g pnpm`。

### 5.2 安装依赖

在项目根目录执行：

```bash
pnpm install
```

### 5.3 运行子模块构建 / 开发

仍在项目根目录，使用以下命令：

- 构建/监听 **Vue 3.5 响应式（对照版）**：

  ```bash
  pnpm run dev:reactivity
  ```

- 构建/监听 **Vue 3.4 响应式（主学习版）**：

  ```bash
  pnpm run dev:reactivity3.4
  ```

- 构建/监听 **runtime-dom（含 runtime-core）**：

  ```bash
  pnpm run dev:runtime-dom
  ```

- 构建/监听 **compiler-core**：

  ```bash
  pnpm run dev:compiler-core
  ```

这些命令底层都通过 `scripts/dev.js` + `esbuild` 对每个包进行打包，产物输出到对应包的 `dist/` 目录中，供 demo HTML 引用。

### 5.4 打开 Demo 验证

构建完成后，可以直接在浏览器中双击或通过本地静态服务器打开各包的 demo：

- 响应式 demo：
  - `packages/reactivity3.4/demo/*.html`
  - `packages/reactivity/example/*.html`
- 运行时 demo：
  - `packages/runtime-dom/demo/*.html`
- 编译器 demo：
  - `packages/compiler-core/demo/*.html`

建议从最简单的 demo 开始，比如：

- `packages/reactivity3.4/demo/01-基本边界条件验证.html`
- `packages/runtime-dom/demo/01-原vue中的用法.html`
- `packages/compiler-core/demo/01-compile.html`

---

## 六、代码结构与重要文件说明

### 6.1 根目录

- `pnpm-workspace.yaml`：pnpm workspace 配置，声明各子包路径（如 `packages/*`）。
- `tsconfig.json`：TypeScript 配置。
- `eslint.config.mjs`：ESLint 配置，统一代码风格与检查规则。
- `scripts/dev.js`：统一 dev / build 脚本，基于 esbuild 对指定包进行构建。
- `docs/`：文档与学习笔记目录。

### 6.2 各包的通用结构约定

以某个包为例（如 `packages/reactivity3.4`）：

- `src/index.ts`：对外暴露包内部核心 API。
- `src/*.ts`：核心实现代码（例如 `effect.ts`、`reactive.ts` 等）。
- `dist/`：构建产物（不建议直接修改）。
- `demo/` 或 `example/`：纯前端 HTML + script demo 文件，方便快速验证与调试。

当你要理解某个 API（比如 `computed`）时，通常可以：

1. 从 `index.ts` 找到它的导出来源；
2. 跳转到对应实现文件（如 `computed.ts`）查看详细逻辑；
3. 打开对应的 demo HTML 看实际效果。

### 6.3 Demo / Example 的约定

- 命名尽量对应课程中的章节或知识点，例如：
  - `xx-基本边界条件验证.html`
  - `xx-effect递归调用陷阱.html`
  - `xx-patchKeyedChildren方法对比.html`
- 建议新增 demo 时：
  1. 复制一个现有 demo 文件；
  2. 修改标题与脚本内容；
  3. 对应在 README 或笔记中记录该 demo 演示的核心点。

---

## 七、推荐学习路线 & 阅读顺序

如果你是第一次系统性阅读 Vue3 源码，可以按下面顺序来：

### 7.1 第一步：`@vue/shared` — 打好工具函数基础

- 目标：熟悉各种工具函数和标志位的含义。
- 关注点：
  - `isObject` / `isArray` 等基础判断；
  - `ShapeFlags` / `PatchFlags` 常量的含义。

### 7.2 第二步：`@vue/reactivity3.4` — 响应式核心（主战场）

- 建议阅读顺序：
  1. `effect.ts` + `reactiveEffect.ts`
  2. `reactive.ts` + `baseHandler.ts`
  3. `ref.ts`
  4. `computed.ts`
  5. `watch.ts`
- 重点问题：
  - 依赖是怎样被收集与触发的？
  - cleanup 机制是如何避免旧依赖泄漏的？
  - scheduler 是如何控制 effect 执行时机的？

### 7.3 第三步：`@vue/runtime-core` — 渲染与组件系统

- 建议顺序：
  1. `renderer.ts`：整体 patch 流程。
  2. `component.ts`：组件实例的创建、挂载与更新。
  3. `scheduler.ts`：更新批量处理。
  4. `apiLifecycle.ts` / `apiProvide.ts`。
- 关注点：
  - vnode 是如何描述 UI？
  - patch 流程中有哪些分支（Element/Component/Fragment/Text 等）？
  - KeepAlive / Teleport / Transition 的实现思路。

### 7.4 第四步：`@vue/runtime-dom` — 连接真实 DOM

- 阅读 `nodeOps.ts` + `patchProp.ts` + `modules/*`。
- 配合 demo 观察：
  - 属性/样式/事件在真实 DOM 上是如何更新的？
  - 列表 diff 与最长递增子序列的优化。

### 7.5 第五步：`@vue/compiler-core` — 模板编译

- 重点理解：
  - 模板 → AST → 渲染函数的整体流程。
  - 指令、插值等是怎样变成 render 函数里的代码的。

### 7.6 第六步：对比 `@vue/reactivity`（3.5）

- 在理解完 3.4 版本后，再来看 3.5 的实现：
  - 对比有哪些重构 / 优化。
  - 思考为什么要做这些调整。

---

## 八、与官方 Vue 源码的差异说明

### 8.1 版本对应关系

- `@vue/reactivity3.4`：对标 **Vue 3.4** 的响应式实现（主学习版本）。
- `@vue/reactivity`：对标 **Vue 3.5** 的响应式实现（对照版本）。

其它包（`runtime-core`、`runtime-dom`、`compiler-core` 等）也主要以 3.4 的实现风格/能力为基础做学习版复刻。

### 8.2 有意为之的简化

为了让代码更适合作为学习材料，本仓库在一些地方做了「有意简化」，例如：

- 省略了一些极端边界 case；
- 精简了部分兼容性处理；
- 对复杂分支做了拆分与重命名，以增强可读性；
- 更偏向「讲清楚思路」而不是「追求极致性能」。

### 8.3 学习建议

- 不要试图「一眼读完全部代码」，而是：
  1. 先通过 demo 理解一个功能的行为；
  2. 再沿着调用链逐步深入实现；
  3. 最后对照官方源码查看差异与优化。
- 每次只聚焦一个小主题（如：依赖收集、computed 缓存、组件更新、patchKeyedChildren 等），理解透彻比「全看一遍」更有价值。

---

## 九、开发与调试指南

### 9.1 本地调试方式

- 在源码中添加适量的 `console.log`，观察调用顺序与参数变化。
- 使用浏览器 DevTools：
  - 对 `demo/*.html` 打断点；
  - 查看调用栈与变量；
  - 结合源码文件位置定位问题。

### 9.2 新增或修改 Demo 的步骤

1. 在对应包的 `demo/` 或 `example/` 目录下，新建/复制一个 HTML 文件。
2. 在 `<script type="module">` 中引入该包打包后的 esm 文件（通常在 `dist/`）。
3. 编写最小可复现的 demo 代码，演示你想观察的行为。
4. 在浏览器中打开该 HTML 文件，观察效果。

### 9.3 代码风格与注释约定

- 代码以 **TypeScript** 为主，类型尽量明确。
- 注释以 **中文** 为主，优先解释「为什么这么设计」。
- 对核心算法（如依赖收集、patchKeyedChildren、LIS 等）会添加相对详细的注释，方便二次复习。

---

## 十、适合人群 & 后续可以拓展的方向

### 10.1 适合人群

- 已经有一定 Vue 3 使用经验，希望「从使用者升级为源码读者」的前端工程师；
- 想要深入理解响应式系统、虚拟 DOM、编译器等前端工程核心原理的同学；
- 喜欢通过「动手实现」来学习框架的同学。

### 10.2 可以继续拓展的方向（可选）

以下是一些你可以在本仓库基础上继续尝试的方向：

- 为更多特性补充 demo（例如：Teleport 更复杂的用法、Transition 不同过渡模式等）。
- 对照官方 Vue 源码，补全部分被简化/省略的功能或边界 case。
- 为关键模块补充单元测试，让行为更加可验证与稳定。
- 在 `docs/` 中整理自己的二次学习笔记，形成属于你自己的「Vue 源码读书笔记」。
