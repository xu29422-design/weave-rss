# FUNCTION_INVOCATION_TIMEOUT 解决方式

线上出现 `504`、`X-Vercel-Error: FUNCTION_INVOCATION_TIMEOUT` 时，说明 **Inngest 某一步** 在 Vercel 上执行时间超过了当前允许的 **maxDuration**（默认多为 10s/60s）。下面两种方式可单独或组合使用。

---

## 方案一：提高 Vercel 函数最大执行时间（推荐先做）

**思路**：让 `/api/inngest` 这条路由允许跑得更久，单步就不容易超时。

### 1. Vercel 限制说明

| 计划 | 默认/可配置 maxDuration |
|------|-------------------------|
| Hobby | 一般 10s，部分区域/配置下可到 60s |
| Pro | 默认 60s，可在 dashboard 或代码里调到 **300s（5 分钟）**，部分可到 800s |
| Enterprise | 可配置更高 |

具体以 [Vercel 文档](https://vercel.com/docs/functions/configuring-functions/duration) 和当前项目套餐为准。

### 2. 在代码里为 Inngest 路由单独加 maxDuration（Next.js App Router）

在 **`app/api/inngest/route.ts`** 顶部（在 `import` 之后、`serve` 之前）增加：

```ts
// 允许 Inngest 单步最长执行 5 分钟，避免 digest 某一步超时
export const maxDuration = 300;
```

若你当前套餐只允许 60s，就改成：

```ts
export const maxDuration = 60;
```

保存后重新部署。这样 **只** 对 `/api/inngest` 生效，其它 API 不受影响。

### 3. 用 vercel.json 配置（可选）

若你更习惯用配置文件，可在项目根目录 **`vercel.json`** 里为 inngest 路由指定时长（单位：秒）：

```json
{
  "functions": {
    "app/api/inngest/route.ts": {
      "maxDuration": 300
    }
  }
}
```

注意：**不能超过你当前 Vercel 套餐允许的上限**，否则部署时可能报错或回退到默认值。

### 4. 方案一的效果与局限

- **优点**：只改配置，不动业务逻辑，立即生效。
- **局限**：若单步实际要跑 6～10 分钟（例如源很多、AI 很慢），即使设成 300s 仍会超时，这时需要配合方案二。

---

## 方案二：把 digest 里最耗时的 step 拆小（根本缓解）

**思路**：让「单次 HTTP 调用」里做的事变少，每步都在 1～2 分钟内结束，这样在 60s/300s 的 maxDuration 下更安全。

当前最容易超时的两步是：

1. **analyze-batch-0 / analyze-batch-1**：一批最多 40 条，每条一次 AI 分析 + 延迟，单步可能 2～5 分钟。
2. **generate-batch-content**：多轮 AI（TLDR + 多个分类综述），单步可能 1～3 分钟。

### 1. 拆小「AI 分析」这一步

**现状**：`inngest/functions/daily-digest.ts` 里是「每批 40 条」在一个 step 里串行分析：

```ts
const analyzed = await step.run(`analyze-batch-${i}`, async () => {
  for (const item of batch) {
    const result = await analyzeItem(item, settings!);
    results.push(result);
    await smartDelay(settings!);
  }
  return results;
});
```

**改法**：把一批 40 条拆成多个子 step，例如每 10 条一个 step：

- 例如 `analyze-batch-0-part-0`（条 0～9）、`analyze-batch-0-part-1`（条 10～19）…
- 每个 step 只跑 10 次 `analyzeItem` + 延迟，单步时长大约降到原来的 1/4。
- 最后把多个 step 的返回值在 worker 里拼成 `analyzedBatches[i]`，后面 **generate-batch-content** 和 **assemble-and-send** 不用改。

这样单步更短，在 60s/300s 下不容易再超时。

### 2. 拆小「generate-batch-content」这一步

**现状**：TLDR + 多个分类的 `writeCategorySection` 都在一个 step 里跑。

**改法**：

- 把「为当前批生成 TLDR」单独成一个 step（例如 `generate-tldr-batch-0`）。
- 把「为当前批每个分类生成 section」拆成多个 step，例如每个分类一个 step：`generate-section-batch-0-cat-0`、`generate-section-batch-0-cat-1`…
- 每个 step 只做 1 次 AI 调用，时长可控。
- 最后在 worker 里把 tldr + sections 拼成原来的 `batchResults[i]`，再交给 **assemble-and-send**。

这样 **generate-batch-content** 不再是一个「巨无霸」step，超时概率会小很多。

### 3. 方案二的效果与注意点

- **优点**：单步变短，从根上避免 FUNCTION_INVOCATION_TIMEOUT；步骤更多也便于在 Inngest 里看哪一步慢。
- **注意**：step 数量会变多，实现时要保证各 step 的输入/输出和当前逻辑一致（尤其是 `analyzedBatches`、`batchResults` 的结构），避免影响后续推送。

---

## 建议执行顺序

1. **先做方案一**：在 `app/api/inngest/route.ts` 加 `export const maxDuration = 300`（或你套餐允许的最大值），部署后看是否还会 504。
2. **若仍超时**：在 Inngest Dashboard 里看是 **哪一步** 超时（例如 `analyze-batch-0` 或 `generate-batch-content`），再按方案二只拆那一步（先拆分析，再视情况拆生成）。
3. **可选**：Vercel 若提供 **Fluid Compute** 或更长时限的运行时，可同时配合使用，进一步降低单步超时概率。

---

## 小结

| 方式 | 操作 | 适用场景 |
|------|------|----------|
| 方案一 | 为 `/api/inngest` 设置 `maxDuration`（代码或 vercel.json） | 单步在 1～5 分钟内能跑完，只是默认 10s/60s 太短 |
| 方案二 | 把 analyze / generate-batch-content 拆成多个小 step | 单步经常超过 5 分钟，或希望长期稳定不依赖顶格配置 |

按上面顺序做，一般就能详细、可落地地解决你遇到的 FUNCTION_INVOCATION_TIMEOUT。
