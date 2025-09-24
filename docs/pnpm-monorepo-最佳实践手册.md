## pnpm Monorepo 最佳实践手册

> 本手册聚焦 pnpm 下的 Monorepo 搭建、源码直连与构建产物消费的策略选择、从零搭建步骤与常见问题排查。适用于库型与应用型仓库。

### 01. 为什么选择 pnpm Monorepo

- **磁盘/安装效率**: 基于硬链接和内容寻址，大幅减少重复包体与安装耗时。
- **严格去重**: 天然避免幽灵依赖，依赖关系更可控。
- **Workspace 协作**: 支持 `workspace:*` 版本协议，子包互相引用清晰可靠。
- **生态兼容**: 与 Turbo/Nx/Vite/Rollup/esbuild 等工具链良好协作。

### 02. 目录结构与命名规范

推荐结构（示例）：

```text
repo/
  pnpm-workspace.yaml
  package.json            # 根脚本与开发工具配置
  tsconfig.base.json      # 根 TS 配置（或 tsconfig.json）
  docs/
  packages/
    shared/
      package.json
      src/
    reactivity/
      package.json
      src/
    vue/
      package.json
      src/
  apps/
    web/
      package.json
      src/
  tools/
    scripts/
```

- **包命名**: 推荐作用域前缀（如 `@scope/shared`）。内部库与对外库均遵循一致命名。
- **发布策略**: 对外库需保证 `exports`/`types`/产物命名规范；内部库可视情况简化。

### 03. 工作空间与基础配置

pnpm 工作空间：

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
  - '!**/dist/**'      # 可选：避免把 dist 识别为子包
```

根 package.json（要点示例）：

```json
{
  "name": "repo-root",
  "private": true,
  "packageManager": "pnpm@9",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "eslint .",
    "clean": "pnpm -r --parallel exec rimraf dist .turbo"
  }
}
```

根 TS 配置（编辑器与类型检查基准）：

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "resolveJsonModule": true,
    "lib": ["ESNext", "DOM"],
    "baseUrl": ".",
    "paths": {
      "@scope/*": ["packages/*/src"]
    }
  }
}
```

说明：上面的 `paths` 只影响 TypeScript（编辑器/tsc），不自动影响打包器与运行时，构建期若要同样走源码需为构建工具单独配置 alias（见第 06 章）。

### 04. 源码直连 vs 构建产物（原则与取舍）

- **源码直连（paths/alias → `packages/*/src`）**
  - 优点：开发反馈快、断点直达源码、无需“先构建依赖包”。
  - 缺点：与真实发布形态不同，容易掩盖打包/入口/Tree-shaking 问题；
    需在构建器/测试/运行时重复配置 alias，存在不一致风险。
  - 适用：应用型 Monorepo、内部库开发期、快速迭代阶段。

- **构建产物消费（通过子包 package.json 的 `exports`/`main`/`module`）**
  - 优点：与发布形态一致，能尽早暴露入口、产物命名、条件导出、类型等问题；工具链无需额外 alias。
  - 缺点：需要“先构建依赖”，本地需并行 watch 或增量构建。
  - 适用：对外发布的库、稳定期、CI/CD 验证阶段。

- **推荐混合策略**
  - 本地开发优先“源码直连”；
  - 提交/CI 前新增一次“从 dist 消费”的校验构建与测试，确保发布形态无误。

### 05. 从零搭建步骤（脚手架）

1) 初始化仓库与工作空间

```bash
pnpm init -y
pnpm dlx create-eslint-config   # 或手动配置 ESLint/Prettier
```

创建 `pnpm-workspace.yaml`、根 `package.json`、`tsconfig.base.json`。

2) 创建子包（库包示例）

```bash
mkdir -p packages/shared/src
cat > packages/shared/package.json << 'JSON'
{
  "name": "@scope/shared",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/shared.cjs.js",
  "module": "./dist/shared.esm.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/shared.esm.js",
      "require": "./dist/shared.cjs.js"
    }
  },
  "files": ["dist"],
  "sideEffects": false,
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts --sourcemap --out-dir dist",
    "dev": "tsup src/index.ts --format esm,cjs --dts --sourcemap --watch --out-dir dist"
  }
}
JSON
```

> 注：使用 Rollup/esbuild 亦可，关键是保证产物与 `exports` 路径命名一致（如 `shared.esm.js`/`shared.cjs.js`）。

3) 互相依赖（使用 workspace 协议）

```json
{
  "dependencies": {
    "@scope/shared": "workspace:^"
  }
}
```

4) 构建脚本统一

- 根脚本：

```json
{
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build"
  }
}
```

- 需“从 dist 消费”时，先构建依赖包：

```bash
pnpm -r build            # 或使用 Turbo/Nx 的受影响构建
```

5) 类型声明与校验

- 使用 tsup/rollup-plugin-dts/tsc 产出 `*.d.ts`，并通过 `types`/`exports.types` 暴露。
- 在 CI 中添加“从产物消费”的一次编译/测试，避免仅在源码直连模式下通过。

### 06. 开发模式配置

- 源码直连（开发期）

  - TS：根 `tsconfig` 添加 `paths` 指到 `packages/*/src`。
  - 构建器：给 esbuild/rollup/vite 增加 alias（示例：esbuild）：

  ```js
  // esbuild.config.js 片段
  import alias from 'esbuild-plugin-alias'
  export default {
    plugins: [
      alias({
        '@scope/shared': new URL('./packages/shared/src/index.ts', import.meta.url).pathname
      })
    ]
  }
  ```

  - 测试/运行时：jest/tsx 也需要 paths 映射（如 ts-jest 的 pathsToModuleNameMapper、vite-node 的 alias）。

- 构建产物模式（发布期）

  - 不给构建器配置 alias，让其按 Node 解析（`exports`→`main`）。
  - 通过 pnpm 递归脚本或 Turbo/Nx 做受影响构建与 watch：

  ```bash
  pnpm -r --parallel dev        # 多包同时 watch
  # 或 Turbo
  turbo run dev --parallel
  ```

### 07. 依赖管理与版本策略

- **workspace 协议**：`workspace:*` 精确对齐本地包，`workspace:^`/`~` 按 semver 表示意图。
- **peerDependencies**：对外库常用，避免重复打包宿主依赖（如 React/Vue）。
- **devDependencies**：仅开发需要的工具放到各包或根；可通过 `pnpm -w add -D` 安装到根共享。
- **范围提升**：保持合理的去重，避免显式依赖缺失（pnpm 默认更严格）。

### 08. 构建、测试与 CI/CD

- **并行与受影响构建**：Turbo/Nx 推荐；无工具时可用 `pnpm -r --filter ...`。
- **测试矩阵**：Node 版本/平台矩阵测试；对库型仓库建议 ESM/CJS 双形态测试。
- **发布前校验**：
  - 运行“从 dist 消费”的构建和测试（禁用 alias）。
  - 检查产物与 `exports` 对齐；`module` 字段是给打包器看的，Node 运行时优先 `exports`/`main`。
  - 可用 `npx publint`/`npm pack` 预检发布包内容。

### 09. 常见问题排查

- “ESM 环境却找 CJS”：未配置 `exports` 时，Node 会回落到 `main`（常为 CJS）；添加条件导出：

```json
{
  "exports": { ".": { "import": "./dist/index.mjs", "require": "./dist/index.cjs" } }
}
```

- “别名只在编辑器生效，构建报错”：记住 tsconfig 的 `paths` 仅影响 TS，构建器/测试需各自配置 alias。
- “解析到了另一个副本”：检查 `pnpm why <pkg>`、`require.resolve('<pkg>/package.json')`/`import.meta.resolve`，排查全局/本地 link 污染，必要时 `pnpm unlink` 并重装。
- “产物命名不一致导致解析失败”：统一构建产物命名与 `exports`/`main/module` 字段。
- “Tree-shaking 不生效”：确保 `sideEffects:false`、使用 ESM 产物、避免在入口产生副作用。

### 10. 模板与命令速查

- 检查包解析到的物理路径：

```bash
pnpm why @scope/shared
node -p "require.resolve('@scope/shared/package.json')"
node --input-type=module -e "console.log(await import.meta.resolve('@scope/shared/package.json'))"
```

- 常用 pnpm 工作区命令：

```bash
pnpm -r build                    # 递归构建
pnpm -r --parallel dev           # 并行开发
pnpm -r --filter @scope/web dev  # 仅运行指定包
pnpm -r test                     # 递归测试
```

- 统一构建产物命名（Rollup/tsup/esbuild 任一工具均可，关键在于产物名与 exports 对齐）。

### 决策建议（简版）

- **应用型仓库**：本地开发走源码直连；CI 增加“从 dist 消费”一次构建与测试。
- **库型仓库（需发布）**：日常也可源码直连提升效率，但在 merge/publish 前必须从 dist 消费做全链路校验；对外发布时务必同时产出 ESM+CJS、提供 `exports`/`types`、保证产物命名一致。

---

若你当前项目已启用 `paths` 源码直连，但希望验证“构建产物消费”，建议在构建脚本里移除 alias，并确保：

- 子包 `package.json` 的 `exports` 与产物命名一致；
- 先构建依赖包再构建上层（或使用 Turbo/Nx 的受影响构建）。


