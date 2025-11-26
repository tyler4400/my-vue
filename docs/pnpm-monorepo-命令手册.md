## pnpm Monorepo 命令手册（以新增 `compiler-core` 为例）

> 本手册聚焦在现有 pnpm Monorepo 架构下，如何新增一个子包 `compiler-core`，以及在子包中安装依赖。  
> 特别说明：当本地 workspace 与 npm registry 中**同时存在同名包 `@vue/shared`** 时，如何显式控制到底使用“本地符号链接”还是“远程下载的官方包”。

---

### 01. 项目结构与工作区约定

- **项目根目录**

  ```bash
  cd /Users/tylerzzheng/Code/VueProjects/vue3-camp/my-vue
  ```

- **工作区配置（已存在）**

  ```yaml
  # pnpm-workspace.yaml
  packages:
    - 'packages/*'
    # 排除测试目录中的包
    - '!**/test/**'
  ```

  说明：

  - 只要在 `packages` 目录下新增子目录（例如 `packages/compiler-core`），且该目录下存在合法的 `package.json`，pnpm 就会自动识别为一个 workspace 子包。
  - 因此 **新增 `compiler-core` 时无需修改 `pnpm-workspace.yaml`**。

- **命名建议**

  - 目录名：`packages/compiler-core`
  - 包名：`"name": "@my-vue/compiler-core"`（作用域可按当前仓库风格替换，例如 `@vue-mini/compiler-core`）
  - 约定入口：`src/index.ts`

---

### 02. 新建子项目 `compiler-core` 的完整流程

#### 2.1 创建目录

```bash
cd /Users/tylerzzheng/Code/VueProjects/vue3-camp/my-vue

mkdir -p packages/compiler-core
```

#### 2.2 初始化 `package.json`

有两种等价写法，二选一即可：

- **方式 A：进入子目录再初始化**

  ```bash
  cd /Users/tylerzzheng/Code/VueProjects/vue3-camp/my-vue/packages/compiler-core

  pnpm init -y
  ```

- **方式 B：在根目录使用 `-C` 切换目录**

  ```bash
  cd /Users/tylerzzheng/Code/VueProjects/vue3-camp/my-vue

  pnpm -C packages/compiler-core init -y
  ```

完成后，`packages/compiler-core/package.json` 会被创建。

#### 2.3 推荐的 `package.json` 结构（示例）

> 实际字段可参考现有包（如 `runtime-core`、`runtime-dom`）做对齐，这里给出一个通用模板：

```jsonc
{
  "name": "@my-vue/compiler-core",
  "version": "0.0.1",
  "private": true,
  "main": "dist/index.cjs",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsc -w -p tsconfig.json",
    "test": "vitest"
  },
  "dependencies": {},
  "devDependencies": {}
}
```

要点：

- **`name` 必须唯一**，且与后续 `--filter` 中使用的名字保持一致。
- **`private`**：学习项目一般可设为 `true`，避免误发布。
- **`scripts`**：根据仓库内既有包的习惯调整（可以用 rollup/tsup 等）。

---

### 03. 在 `compiler-core` 中安装依赖

下面所有命令都假设在仓库根目录执行：

```bash
cd /Users/tylerzzheng/Code/VueProjects/vue3-camp/my-vue
```

#### 3.1 安装运行时依赖（`dependencies`）

```bash
pnpm add lodash --filter @my-vue/compiler-core
```

说明：

- 不加 `-D` 时，默认写入 `dependencies`。
- `--filter @my-vue/compiler-core` 表示：**只对 `@my-vue/compiler-core` 这个子包生效**。

如果包名还没想好，也可以用目录过滤：

```bash
pnpm add lodash --filter ./packages/compiler-core
```

#### 3.2 安装开发依赖（`devDependencies`）

```bash
pnpm add -D typescript --filter @my-vue/compiler-core
pnpm add -D vitest --filter @my-vue/compiler-core
```

- `-D` / `--save-dev`：写入 `devDependencies`。

#### 3.3 安装 workspace 内部的其它子包

例如：`compiler-core` 依赖本地的 `@vue/shared`（workspace 包），常见写法有两种：

1. **简单写法（依赖 workspace 配置与 pnpm 默认行为）**

   ```bash
   pnpm add @vue/shared --filter @my-vue/compiler-core
   ```

   - 前提：当前 Monorepo 内已经有一个名为 `@vue/shared` 的子包，且在 `pnpm-workspace.yaml` 中被匹配到。
   - 通常情况下，pnpm 会识别这个 workspace 包，并在 `node_modules` 中创建 **符号链接** 指向本地源码。
   - 这种写法简单，但当 registry 中也有同名的官方 `@vue/shared` 时，容易让人不清楚“到底连的是本地还是远程”。

2. **显式写法（强烈推荐，用于教学与避免歧义）**

   详见第 04 章，这里先给出一个直观示例：

   ```bash
   # 强制使用本地 workspace 内的 @vue/shared
   pnpm add @vue/shared@workspace:* --filter @my-vue/compiler-core

   # 强制从 registry 安装官方 @vue/shared
   pnpm add @vue/shared@npm:latest --filter @my-vue/compiler-core
   ```

#### 3.4 在根级安装“全仓库共用”的工具

例如安装 `typescript` 到根 package.json（所有包共享）：

```bash
pnpm add -D typescript -w
# 等价写法：
# pnpm add -D typescript --workspace-root
```

- 适合安装 ESLint、Prettier、TypeScript 等通用工具。

---

### 04. 重点：在子包中安装 `@vue/shared`（本地 vs registry）

> 假设现在存在这样的情况：
>
> - 本地 workspace 中有一个子包叫 `@vue/shared`（用于源码学习、对照实现等）
> - npm registry 上也有官方的 `@vue/shared` 包
> - 你希望在 `@my-vue/compiler-core` 中安装 `@vue/shared`，并**明确控制**它到底指向“本地”还是“registry”

#### 4.1 情况一：使用本地 workspace 内的 `@vue/shared`（建立符号链接）

**推荐写法：使用 `workspace:` 协议显式指定**

```bash
cd /Users/tylerzzheng/Code/VueProjects/vue3-camp/my-vue

pnpm add @vue/shared@workspace:* --filter @my-vue/compiler-core
```

- `@vue/shared@workspace:*` 的含义：
  - 只从 **workspace 内** 查找 `@vue/shared`；
  - 如果 workspace 中没有这个包，命令会直接报错；
  - 找到后，会在 `compiler-core` 的 `node_modules` 中建立指向本地 `@vue/shared` 的 **符号链接**；
  - `compiler-core/package.json` 中记录的版本通常类似于：

    ```jsonc
    {
      "dependencies": {
        "@vue/shared": "workspace:*"
      }
    }
    ```

> 记忆规则：  
> **带 `workspace:` 的版本号 → 一定使用本地 workspace 包，不会从 registry 下载。**

#### 4.2 情况二：从 npm registry 安装官方 `@vue/shared`（不使用本地包）

**推荐写法：使用 `npm:` 协议显式指定**

```bash
cd /Users/tylerzzheng/Code/VueProjects/vue3-camp/my-vue

# 安装官方最新版本的 @vue/shared
pnpm add @vue/shared@npm:latest --filter @my-vue/compiler-core

# 或指定版本号，比如 3.4.0
# pnpm add @vue/shared@npm:3.4.0 --filter @my-vue/compiler-core
```

- `@vue/shared@npm:latest` 的含义：
  - 忽略 workspace 中同名的 `@vue/shared` 包；
  - 强制从 npm registry 下载对应版本；
  - `compiler-core/package.json` 中记录的版本通常类似于：

    ```jsonc
    {
      "dependencies": {
        "@vue/shared": "npm:3.4.0"
      }
    }
    ```

> 记忆规则：  
> **带 `npm:` 的版本号 → 一定从 registry 下载，不会使用本地 workspace 包。**

#### 4.3 不加协议时的默认行为（理解为主，生产中建议显式写）

当你执行：

```bash
pnpm add @vue/shared --filter @my-vue/compiler-core
```

是否会优先连本地 workspace 包，还是直接从 registry 下载，取决于：

- 你的 pnpm 版本；
- 工作区配置（如 `link-workspace-packages`、`prefer-workspace-packages` 等隐式配置）；
- `.npmrc` 中是否有相关配置。

在教学与源码学习场景中，为了避免“看半天不知道依赖到底来自哪”的情况，**更推荐在本地与 registry 同名的场景下一律显式使用 `workspace:` 或 `npm:` 协议**。

#### 4.4 小结：`@vue/shared` 来源快速判断表

- **希望使用本地 workspace 内的 `@vue/shared`**

  ```bash
  pnpm add @vue/shared@workspace:* --filter @my-vue/compiler-core
  ```

  - 结果：建立到本地子包的符号链接。

- **希望使用 registry 中的官方 `@vue/shared`**

  ```bash
  pnpm add @vue/shared@npm:latest --filter @my-vue/compiler-core
  # 或指定版本：
  # pnpm add @vue/shared@npm:3.4.0 --filter @my-vue/compiler-core
  ```

  - 结果：从 npm registry 下载，对应版本被锁定在 lockfile 中。

---

### 05. 在 `compiler-core` 中运行脚本

#### 5.1 进入子包目录运行

```bash
cd /Users/tylerzzheng/Code/VueProjects/vue3-camp/my-vue/packages/compiler-core

pnpm build
pnpm dev
pnpm test
```

#### 5.2 在根目录通过 `--filter` 运行

```bash
cd /Users/tylerzzheng/Code/VueProjects/vue3-camp/my-vue

pnpm --filter @my-vue/compiler-core build
pnpm --filter @my-vue/compiler-core dev
pnpm --filter @my-vue/compiler-core test
```

#### 5.3 递归运行（对比理解 Monorepo 场景）

```bash
# 对所有子包执行 build（有 build 脚本的才会执行）
pnpm -r build

# 对所有子包并行执行 dev
pnpm -r --parallel dev
```

---

### 06. 常用命令速查表（以 `compiler-core` 为例）

- **创建子包并初始化**

  ```bash
  mkdir -p packages/compiler-core
  pnpm -C packages/compiler-core init -y
  ```

- **安装运行时依赖**

  ```bash
  pnpm add some-lib --filter @my-vue/compiler-core
  ```

- **安装开发依赖**

  ```bash
  pnpm add -D vitest --filter @my-vue/compiler-core
  ```

- **安装 workspace 内的本地包（符号链接）**

  ```bash
  pnpm add @vue/shared@workspace:* --filter @my-vue/compiler-core
  ```

- **从 registry 安装官方包**

  ```bash
  pnpm add @vue/shared@npm:latest --filter @my-vue/compiler-core
  ```

- **在 `compiler-core` 中运行构建/开发/测试**

  ```bash
  pnpm --filter @my-vue/compiler-core build
  pnpm --filter @my-vue/compiler-core dev
  pnpm --filter @my-vue/compiler-core test
  ```

- **列出 workspace 中的所有包**

  ```bash
  pnpm list --depth -1
  # 或
  pnpm m ls
  ```

- **查看 `compiler-core` 的依赖树**

  ```bash
  pnpm list --filter @my-vue/compiler-core
  ```

- **删除依赖**

  ```bash
  pnpm remove some-lib --filter @my-vue/compiler-core
  ```

---

### 07. 常见问题与排查

- **Q1：新建了 `packages/compiler-core`，`pnpm m ls` 里看不到？**

  检查：

  - 目录下是否存在 `package.json`；
  - `package.json` 中是否有合法的 `name` 字段（如 `@my-vue/compiler-core`）；
  - 目录路径是否匹配 `pnpm-workspace.yaml` 中的 `packages/*` 规则（不要放在被排除的目录下，如 `test`）。

- **Q2：`pnpm add xxx --filter @my-vue/compiler-core` 提示找不到包？**

  多半是 `@my-vue/compiler-core` 自己没有被识别为 workspace 包，检查：

  - `compiler-core/package.json` 中的 `"name"` 是否真的叫 `@my-vue/compiler-core`；
  - 大小写、作用域前缀是否完全一致。

- **Q3：如何确认 `@vue/shared` 最终用的是本地还是 registry 版本？**

  - 看 `compiler-core/package.json` 中的版本号：
    - `"workspace:*"` → 本地 workspace 包（符号链接）；
    - `"npm:x.y.z"` 或普通 semver → 配合 `.pnpm-lock.yaml` 可以确认来自 registry。
  - 命令层面：
    - 使用 `@vue/shared@workspace:*` 安装 → 一定走本地 workspace；
    - 使用 `@vue/shared@npm:...` 安装 → 一定从 registry 下载。

---

本手册与《pnpm Monorepo 最佳实践手册》配合阅读，可以一边学习整体设计原则，一边对照这里的**“以 `compiler-core` 为例”**的具体命令操作，从而快速在当前 Vue 源码学习仓库中完成新的子包搭建与依赖管理。


