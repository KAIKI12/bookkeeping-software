# 单人智能记账软件 MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 交付一个面向单人用户的智能记账 MVP，优先覆盖手机端高频记账、AI 解析录入、分类/标签/备注体系、月/年/日历统计、存钱目标预测和基础账单导入。

**Architecture:** 采用单仓分层结构，先用共享业务层承载数据模型、记账规则、统计计算和预测逻辑，再分别接入手机端 UI 与 Web 基础查看端。第一阶段严格控制范围，优先实现本地可跑通的完整闭环，再补云同步、个性化学习和更强导入能力。

**Tech Stack:** React Native（Expo）手机端、Next.js Web 端、TypeScript、SQLite（本地存储）、Drizzle ORM 或等价轻量数据层、Zod、Vitest、React Query、一个可替换的 LLM 解析适配层

---

## 实施原则

1. 先搭业务闭环，再补体验细节。
2. 先写失败测试，再写最小实现，再跑通测试。
3. 第一版不做复杂账户体系、不做多人账本、不做重型后端。
4. Web 端只做基础查看、验证和管理，不抢手机端主流程。
5. AI 能力必须经过业务规则二次收敛，不能直接把模型输出落库。

## 目录建议

在还没有代码的前提下，先建立如下最小目录：

```text
apps/
  mobile/
  web/
packages/
  core/
  ai/
  database/
  ui/
docs/
  superpowers/specs/
  plans/
```

- `apps/mobile`：手机端主应用
- `apps/web`：Web 查看与管理端
- `packages/core`：数据模型、统计、预测、分类收敛规则
- `packages/ai`：自然语言解析和模型输出规整
- `packages/database`：数据库 schema 与数据访问
- `packages/ui`：可复用 UI 组件（后续再抽，MVP 不强求过早抽象）

## MVP 阶段拆分

### Phase 0：项目骨架与工程基线
目标：把仓库初始化成可持续开发的 monorepo，并让测试先跑起来。

### Phase 1：核心数据模型与本地存储
目标：定义账单、分类、标签、目标、导入记录等核心模型，落到本地数据库。

### Phase 2：手动记账闭环（不含 AI）
目标：先用最普通输入方式把“新增账单 -> 首页展示 -> 统计更新”跑通。

### Phase 3：AI 解析输入闭环
目标：接入一句话/语音/聊天输入解析，并通过规则层生成稳定账单草稿。

### Phase 4：统计分析与存钱预测
目标：补齐月度、年度、日历统计及目标预测。

### Phase 5：账单导入
目标：支持微信/支付宝账单文件导入，并完成分类映射与去重。

### Phase 6：Web 基础查看端
目标：提供桌面端基础查看、搜索和分类管理能力。

### Phase 7：P1 增强
目标：个性化学习、分类治理建议、多目标、周期记账等。

---

### Task 1: 初始化 monorepo 与基础工具链

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `apps/mobile/package.json`
- Create: `apps/web/package.json`
- Create: `packages/core/package.json`
- Create: `packages/ai/package.json`
- Create: `packages/database/package.json`
- Create: `.gitignore`
- Test: `package.json` scripts

**Step 1: 写初始化脚本和 workspace 配置**

```json
{
  "name": "bookkeeping-software",
  "private": true,
  "packageManager": "pnpm@10",
  "scripts": {
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck"
  }
}
```

**Step 2: 运行依赖安装验证 workspace 正常**

Run: `pnpm install`
Expected: 成功生成 lockfile，无 workspace 解析错误

**Step 3: 为 mobile / web / packages 填最小 package.json**

```json
{
  "name": "@bookkeeping/core",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

**Step 4: 再次运行测试与类型检查命令**

Run: `pnpm test && pnpm typecheck`
Expected: 当前无测试或空测试通过；类型检查通过

**Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json apps packages .gitignore
git commit -m "chore: initialize monorepo workspace"
```

---

### Task 2: 建立核心领域模型与 schema 测试

**Files:**
- Create: `packages/core/src/models.ts`
- Create: `packages/core/src/models.test.ts`
- Create: `packages/database/src/schema.ts`
- Create: `packages/database/src/schema.test.ts`
- Modify: `packages/core/package.json`
- Modify: `packages/database/package.json`

**Step 1: 先写模型测试，锁定最小实体**

```ts
import { describe, expect, it } from 'vitest'
import { billSchema, savingGoalSchema } from './models'

describe('models', () => {
  it('accepts a valid expense bill', () => {
    const bill = billSchema.parse({
      id: 'bill-1',
      type: 'expense',
      amount: 28,
      categoryId: 'lunch',
      tagIds: ['travel'],
      note: '旅游午饭',
      occurredAt: '2026-04-08T12:00:00.000Z',
    })

    expect(bill.amount).toBe(28)
  })
})
```

**Step 2: 跑测试确认失败**

Run: `pnpm --filter @bookkeeping/core test`
Expected: FAIL，提示 `billSchema` 未定义

**Step 3: 写最小模型实现**

```ts
import { z } from 'zod'

export const billSchema = z.object({
  id: z.string(),
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  categoryId: z.string(),
  tagIds: z.array(z.string()).default([]),
  note: z.string().default(''),
  occurredAt: z.string(),
})

export const savingGoalSchema = z.object({
  id: z.string(),
  name: z.string(),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0),
  targetDate: z.string().optional(),
})
```

**Step 4: 在 database schema 中同步最小表结构**

至少包含：
- `bills`
- `categories`
- `tags`
- `bill_tags`
- `saving_goals`
- `imports`

**Step 5: 运行测试**

Run: `pnpm --filter @bookkeeping/core test && pnpm --filter @bookkeeping/database test`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/core packages/database
git commit -m "feat: add core finance domain models"
```

---

### Task 3: 建预置分类与分类收敛规则测试

**Files:**
- Create: `packages/core/src/default-categories.ts`
- Create: `packages/core/src/category-policy.ts`
- Create: `packages/core/src/category-policy.test.ts`

**Step 1: 先写失败测试，明确“分类、标签、备注”的分工**

```ts
it('reuses shopping category for clothing purchase', () => {
  const result = normalizeCategoryDecision({
    existingCategories: ['购物', '午饭', '交通'],
    candidateCategory: '上衣',
    suggestedTags: ['服饰'],
    note: '上衣',
  })

  expect(result.category).toBe('购物')
  expect(result.tags).toContain('服饰')
})
```

**Step 2: 跑测试确认失败**

Run: `pnpm --filter @bookkeeping/core test category-policy`
Expected: FAIL

**Step 3: 写最小收敛规则实现**

规则至少包含：
- 具体物品优先归并到稳定大类
- 场景词优先转标签
- 明细词优先进入备注
- 只有无可复用分类且具备长期分析价值时才新增分类

**Step 4: 补更多案例测试**

覆盖：
- `旅游午饭 20` -> 分类午饭、标签旅游
- `宠物看病 300` -> 可新增宠物医疗或宠物
- `买裤子 199` -> 购物 + 服饰 + 备注裤子

**Step 5: 运行测试**

Run: `pnpm --filter @bookkeeping/core test`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/core/src/default-categories.ts packages/core/src/category-policy.*
git commit -m "feat: add category normalization policy"
```

---

### Task 4: 实现本地数据库初始化与 repository

**Files:**
- Create: `packages/database/src/client.ts`
- Create: `packages/database/src/bill-repository.ts`
- Create: `packages/database/src/bill-repository.test.ts`
- Modify: `packages/database/src/schema.ts`

**Step 1: 写 repository 测试**

```ts
it('creates and lists bills ordered by occurredAt desc', async () => {
  const repo = createBillRepository(createTestDb())

  await repo.create({ id: '1', type: 'expense', amount: 28, categoryId: 'lunch', tagIds: [], note: '', occurredAt: '2026-04-08T12:00:00.000Z' })
  const bills = await repo.listRecent()

  expect(bills).toHaveLength(1)
  expect(bills[0].id).toBe('1')
})
```

**Step 2: 跑失败测试**

Run: `pnpm --filter @bookkeeping/database test bill-repository`
Expected: FAIL

**Step 3: 写最小 repository 实现**

实现能力：
- 创建账单
- 查询最近账单
- 查询指定月份账单
- 保存分类与标签关系

**Step 4: 跑测试**

Run: `pnpm --filter @bookkeeping/database test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/database/src
git commit -m "feat: add local bill repository"
```

---

### Task 5: 先做“无 AI”的手机端记账闭环

**Files:**
- Create: `apps/mobile/app/index.tsx`
- Create: `apps/mobile/src/screens/home-screen.tsx`
- Create: `apps/mobile/src/components/month-summary.tsx`
- Create: `apps/mobile/src/components/recent-bill-list.tsx`
- Create: `apps/mobile/src/components/bottom-entry-bar.tsx`
- Create: `apps/mobile/src/screens/home-screen.test.tsx`

**Step 1: 写首页渲染测试**

```tsx
it('renders monthly summary and bottom entry bar', () => {
  render(<HomeScreen />)

  expect(screen.getByText('本月收入')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('输入一句话开始记账')).toBeInTheDocument()
})
```

**Step 2: 跑失败测试**

Run: `pnpm --filter @bookkeeping/mobile test home-screen`
Expected: FAIL

**Step 3: 写最小首页实现**

首页必须先出现：
- 顶部本月收入 / 支出 / 结余
- 最近账单列表容器
- 底部输入栏

**Step 4: 补一个本地手动新增账单流程**

先不走 AI，输入栏支持：
- 金额
- 简单分类
- 确认后保存

目标是验证“新增账单 -> 首页刷新”闭环。

**Step 5: 运行测试**

Run: `pnpm --filter @bookkeeping/mobile test`
Expected: PASS

**Step 6: Commit**

```bash
git add apps/mobile
git commit -m "feat: add mobile home bookkeeping flow"
```

---

### Task 6: 实现 AI 输入草稿协议

**Files:**
- Create: `packages/ai/src/parse-transaction.ts`
- Create: `packages/ai/src/parse-transaction.test.ts`
- Create: `packages/ai/src/types.ts`
- Modify: `packages/core/src/category-policy.ts`

**Step 1: 写 AI 输出规整测试**

```ts
it('normalizes parsed transaction into bill draft', async () => {
  const parser = createTransactionParser(fakeModel({
    type: 'expense',
    amount: 20,
    category: '上衣',
    tags: ['旅游'],
    note: '裤子',
    occurredAt: '2026-04-08T12:00:00.000Z',
  }))

  const result = await parser.parse('旅游时买裤子花了20')

  expect(result.category).toBe('购物')
  expect(result.tags).toContain('旅游')
})
```

**Step 2: 跑测试确认失败**

Run: `pnpm --filter @bookkeeping/ai test`
Expected: FAIL

**Step 3: 写解析适配层**

职责只做两件事：
- 调用模型/规则引擎获取结构化草稿
- 交给 `category-policy` 做二次收敛

注意：
- 不在这里直接写 UI 逻辑
- 不在这里直接写数据库逻辑
- 要保留替换 LLM 提供商的接口

**Step 4: 跑测试**

Run: `pnpm --filter @bookkeeping/ai test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/ai packages/core/src/category-policy.ts
git commit -m "feat: add ai transaction parsing adapter"
```

---

### Task 7: 接入一句话输入与记账预览卡片

**Files:**
- Modify: `apps/mobile/src/components/bottom-entry-bar.tsx`
- Create: `apps/mobile/src/components/bill-draft-preview.tsx`
- Create: `apps/mobile/src/hooks/use-transaction-draft.ts`
- Create: `apps/mobile/src/components/bill-draft-preview.test.tsx`

**Step 1: 写失败测试**

```tsx
it('shows parsed draft before saving', async () => {
  render(<BottomEntryBar />)

  await user.type(screen.getByPlaceholderText('输入一句话开始记账'), '旅游午饭 20')
  await user.click(screen.getByText('解析'))

  expect(await screen.findByText('午饭')).toBeInTheDocument()
  expect(screen.getByText('旅游')).toBeInTheDocument()
})
```

**Step 2: 跑失败测试**

Run: `pnpm --filter @bookkeeping/mobile test bill-draft-preview`
Expected: FAIL

**Step 3: 实现记账草稿预览**

要求：
- 用户先看到 AI 解析结果
- 可以修改分类、标签、备注、时间
- 点击确认后才真正入账

**Step 4: 跑测试**

Run: `pnpm --filter @bookkeeping/mobile test`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/mobile/src/components apps/mobile/src/hooks
git commit -m "feat: add natural language bill draft preview"
```

---

### Task 8: 接语音输入到同一解析链路

**Files:**
- Modify: `apps/mobile/src/components/bottom-entry-bar.tsx`
- Create: `apps/mobile/src/lib/voice-input.ts`
- Create: `apps/mobile/src/lib/voice-input.test.ts`

**Step 1: 写失败测试**

```ts
it('converts voice transcript into the same draft flow', async () => {
  const transcript = '昨天打车 36'
  const result = await createVoiceDraft(transcript)
  expect(result.input).toBe('昨天打车 36')
})
```

**Step 2: 跑测试**

Run: `pnpm --filter @bookkeeping/mobile test voice-input`
Expected: FAIL

**Step 3: 写最小实现**

- 语音识别先只封装“获取 transcript”接口
- 后续再接平台能力
- 当前只要求 transcript 进入与文本完全一致的解析链路

**Step 4: 跑测试**

Run: `pnpm --filter @bookkeeping/mobile test`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/mobile/src/lib apps/mobile/src/components/bottom-entry-bar.tsx
git commit -m "feat: connect voice transcript to parsing flow"
```

---

### Task 9: 实现月度汇总与首页摘要计算

**Files:**
- Create: `packages/core/src/month-summary.ts`
- Create: `packages/core/src/month-summary.test.ts`
- Modify: `apps/mobile/src/components/month-summary.tsx`

**Step 1: 写失败测试**

```ts
it('calculates monthly income expense and balance', () => {
  const summary = getMonthSummary([
    { type: 'income', amount: 5000, occurredAt: '2026-04-01T00:00:00.000Z' },
    { type: 'expense', amount: 100, occurredAt: '2026-04-02T00:00:00.000Z' },
  ], '2026-04')

  expect(summary.income).toBe(5000)
  expect(summary.expense).toBe(100)
  expect(summary.balance).toBe(4900)
})
```

**Step 2: 跑失败测试**

Run: `pnpm --filter @bookkeeping/core test month-summary`
Expected: FAIL

**Step 3: 写最小实现并接到首页摘要卡片**

**Step 4: 跑测试**

Run: `pnpm --filter @bookkeeping/core test && pnpm --filter @bookkeeping/mobile test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/core/src/month-summary.* apps/mobile/src/components/month-summary.tsx
git commit -m "feat: add monthly summary calculation"
```

---

### Task 10: 实现月度、年度、日历统计基础计算

**Files:**
- Create: `packages/core/src/statistics.ts`
- Create: `packages/core/src/statistics.test.ts`
- Create: `apps/mobile/src/screens/analytics-screen.tsx`
- Create: `apps/mobile/src/screens/analytics-screen.test.tsx`

**Step 1: 写失败测试**

```ts
it('groups bills by month and category', () => {
  const stats = buildStatistics(sampleBills)
  expect(stats.monthlyTrend).toHaveLength(12)
  expect(stats.categoryBreakdown[0].name).toBe('午饭')
})
```

**Step 2: 跑失败测试**

Run: `pnpm --filter @bookkeeping/core test statistics`
Expected: FAIL

**Step 3: 写最小统计实现**

最少支持：
- 月度趋势
- 年度趋势
- 分类占比
- 标签聚合
- 日历按日聚合

**Step 4: 写移动端统计页面壳**

先展示可验证的基础数据，不急着做复杂图表库。

**Step 5: 跑测试**

Run: `pnpm --filter @bookkeeping/core test && pnpm --filter @bookkeeping/mobile test analytics-screen`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/core/src/statistics.* apps/mobile/src/screens/analytics-screen.*
git commit -m "feat: add analytics calculations and screen"
```

---

### Task 11: 实现存钱目标模型与预测计算

**Files:**
- Create: `packages/core/src/saving-forecast.ts`
- Create: `packages/core/src/saving-forecast.test.ts`
- Create: `apps/mobile/src/screens/goals-screen.tsx`
- Create: `apps/mobile/src/screens/goals-screen.test.tsx`
- Modify: `packages/core/src/models.ts`

**Step 1: 写失败测试**

```ts
it('forecasts months needed based on average monthly balance', () => {
  const result = forecastSavingGoal({
    targetAmount: 8000,
    currentAmount: 2000,
    monthlyBalances: [1000, 800, 1200],
  })

  expect(result.remainingAmount).toBe(6000)
  expect(result.monthsNeeded).toBe(6)
})
```

**Step 2: 跑失败测试**

Run: `pnpm --filter @bookkeeping/core test saving-forecast`
Expected: FAIL

**Step 3: 写最小预测实现**

输出至少包括：
- 剩余金额
- 平均月结余
- 预计达成月数
- 若目标日期存在时的建议月支出上限

**Step 4: 在 mobile 端做目标页基础展示**

**Step 5: 跑测试**

Run: `pnpm --filter @bookkeeping/core test && pnpm --filter @bookkeeping/mobile test goals-screen`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/core/src/saving-forecast.* apps/mobile/src/screens/goals-screen.*
git commit -m "feat: add saving goal forecast"
```

---

### Task 12: 实现账单导入解析器

**Files:**
- Create: `packages/core/src/imports/wechat-import.ts`
- Create: `packages/core/src/imports/alipay-import.ts`
- Create: `packages/core/src/imports/import-parser.test.ts`
- Create: `apps/mobile/src/screens/import-screen.tsx`
- Create: `apps/mobile/src/screens/import-screen.test.tsx`

**Step 1: 先写失败测试，固定导入后标准结构**

```ts
it('parses wechat csv rows into normalized bills', () => {
  const result = parseWechatImport(sampleCsv)
  expect(result[0].amount).toBe(20)
  expect(result[0].type).toBe('expense')
})
```

**Step 2: 跑失败测试**

Run: `pnpm --filter @bookkeeping/core test import-parser`
Expected: FAIL

**Step 3: 写最小解析实现**

要求：
- 先把微信/支付宝文件映射到统一账单草稿结构
- 去重规则至少基于时间 + 金额 + 对方信息 / 备注 hash
- 导入后仍走分类收敛流程

**Step 4: 写导入页面基础流程**

流程：
- 选择文件
- 预览条数
- 确认导入
- 提示成功/跳过/重复数量

**Step 5: 跑测试**

Run: `pnpm --filter @bookkeeping/core test && pnpm --filter @bookkeeping/mobile test import-screen`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/core/src/imports apps/mobile/src/screens/import-screen.*
git commit -m "feat: add bill import flow"
```

---

### Task 13: 增加分类管理页面

**Files:**
- Create: `apps/mobile/src/screens/categories-screen.tsx`
- Create: `apps/mobile/src/screens/categories-screen.test.tsx`
- Modify: `packages/database/src/bill-repository.ts`

**Step 1: 写失败测试**

```tsx
it('allows rename and merge category', async () => {
  render(<CategoriesScreen />)
  expect(screen.getByText('分类管理')).toBeInTheDocument()
})
```

**Step 2: 跑失败测试**

Run: `pnpm --filter @bookkeeping/mobile test categories-screen`
Expected: FAIL

**Step 3: 写最小实现**

先支持：
- 查看分类列表
- 分类改名
- 分类合并

**Step 4: 跑测试**

Run: `pnpm --filter @bookkeeping/mobile test categories-screen`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/mobile/src/screens/categories-screen.* packages/database/src/bill-repository.ts
git commit -m "feat: add category management"
```

---

### Task 14: 搭 Web 基础查看端

**Files:**
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/analytics/page.tsx`
- Create: `apps/web/app/categories/page.tsx`
- Create: `apps/web/app/page.test.tsx`

**Step 1: 写失败测试**

```tsx
it('renders dashboard summary on web', () => {
  render(<HomePage />)
  expect(screen.getByText('本月收入')).toBeInTheDocument()
})
```

**Step 2: 跑失败测试**

Run: `pnpm --filter @bookkeeping/web test`
Expected: FAIL

**Step 3: 写最小实现**

Web MVP 只需：
- 首页摘要
- 最近账单查看
- 统计查看
- 分类管理入口

**Step 4: 跑测试**

Run: `pnpm --filter @bookkeeping/web test`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web
git commit -m "feat: add web dashboard views"
```

---

### Task 15: MVP 联调与验收脚本

**Files:**
- Create: `docs/plans/mvp-manual-test-checklist.md`
- Modify: `package.json`
- Create: `packages/core/src/fixtures/sample-bills.ts`

**Step 1: 写最小验收清单**

内容至少覆盖：
- 一句话记账
- 语音转文字记账
- 首页摘要更新
- 月/年/日历统计
- 存钱目标预测
- 微信/支付宝导入
- 分类改名与合并
- Web 查看端

**Step 2: 增加种子数据或 fixture**

用于本地快速验证统计和预测页面。

**Step 3: 运行全量测试**

Run: `pnpm test && pnpm typecheck`
Expected: PASS

**Step 4: 记录手动验证结果**

把未自动化覆盖的风险明确记到 checklist。

**Step 5: Commit**

```bash
git add docs/plans/mvp-manual-test-checklist.md packages/core/src/fixtures/sample-bills.ts package.json
git commit -m "chore: add mvp acceptance checklist"
```

---

## P1 计划（MVP 之后）

### Task 16: 个性化分类学习
- 基于用户历史修正记录，为常见商户/词语建立偏好映射。

### Task 17: 分类治理建议
- 定期识别“很像的分类”“几乎没用过的分类”“应降级为标签的分类”。

### Task 18: 多存钱目标
- 支持多个目标并分配各自进度。

### Task 19: 周期记账
- 房租、工资、订阅型账单的自动生成。

### Task 20: OCR 截图导入
- 解析截图并走统一账单草稿流程。

---

## 实现顺序总结

推荐严格按下面顺序推进，不要并行开太多：

1. 工程骨架
2. 数据模型与本地数据库
3. 无 AI 的手动记账闭环
4. 分类收敛规则
5. AI 输入解析与预览
6. 首页汇总
7. 统计分析
8. 存钱预测
9. 账单导入
10. 分类管理
11. Web 基础查看端
12. MVP 联调验收
13. P1 增强

原因：
- 没有本地数据层，AI 和统计都没法稳定落地。
- 没有非 AI 的闭环，AI 出问题时无法验证业务基线。
- 存钱预测依赖稳定账单和月度结余数据。
- 导入放在统计前也可以，但更容易把问题带入系统；建议先把主闭环打稳。

## 风险控制

1. 不要让 LLM 直接决定最终分类落库，必须经过规则层。
2. 不要第一版就上复杂图表库，先保证数据正确。
3. 不要一开始就接远程同步，先把单机闭环做扎实。
4. 导入功能必须先做去重策略测试，否则数据会被污染。
5. 语音输入先统一成 transcript，不要过早卷入平台差异。

## 完成标准

当满足以下条件时，可认为 MVP 完成：

- 用户可在手机端用一句话或语音快速记账
- AI 输出能形成可编辑预览草稿
- 首页能正确显示本月收入、支出、结余
- 用户能查看月度、年度、日历统计
- 用户能创建存钱目标并看到预测结果
- 用户能导入微信/支付宝账单
- 用户能管理分类，避免分类膨胀
- Web 端可完成基础查看与验证
- 自动化测试与基本手动验收通过
