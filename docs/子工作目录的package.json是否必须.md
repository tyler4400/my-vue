# 子工作目录的package.json是否必须
_Exported on 2025/9/24 at GMT+8 13:09:24 from Cursor (1.6.42)_

---

**User**

@package.json pnpm的monorepo项目， 子工作目录的package.json是必须的吗

---

**Cursor**

### 结论
不是所有子目录都“必须”有 `package.json`。但只要该目录要作为 workspace 包参与依赖、构建、发布或被其他包通过 `workspace:*` 引用，就必须有自己的 `package.json`（至少含 `name`、`version`，建议加 `private: true`）。

### 什么时候必须有
- 需要被其他包通过 `workspace:*` 或本地链接依赖。
- 需要单独执行脚本（如 `pnpm -F <pkg> build`、测试等）。
- 需要单独发布或产出构建产物。
- 需要被 `pnpm -F`（filter）精准筛选。

### 如果不需要作为包
- 仅作为某个包的源码子目录，不单独安装/构建/发布：可以没有 `package.json`。
- 同时建议在根目录 `pnpm-workspace.yaml` 的 `packages` 匹配中排除该目录，避免被误识别为包（例如添加排除规则 `!packages/vue` 或不要用会匹配到它的 glob）。

你当前仓库中 `packages/vue/` 看起来没有 `package.json`。如果它要作为独立包使用，建议补上；如果只是源码文件夹，请在 `pnpm-workspace.yaml` 中排除它。

### 最小可用的子包 `package.json` 示例
```json
{
  "name": "@your-scope/vue",
  "version": "0.0.0",
  "private": true
}
```

- 必填：`name`、`version`
- 推荐：`private: true`（防止误发包；若要发布则去掉）
- 后续再按需要补充 `main`/`module`/`types`/`exports`、`scripts`、`dependencies` 等配置。

```json
{
  "name": "@your-scope/vue",
  "version": "0.0.0",
  "private": true
}
```

