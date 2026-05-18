# 新增模型操作文档

> 每次新增模型，按顺序改以下文件即可，缺一不可。

---

## 背景：双 AI 源架构

本项目支持两个 AI 调用源，前端可在配置面板自由切换：

| 源 | 标识 | 适用模型 | 说明 |
|----|------|----------|------|
| **fal.ai** | `fal` | 所有模型 | 默认源，通过 `@fal-ai/client` 代理调用 |
| **Google Vertex AI** | `vertex` | nano-banana 系列 | 直连 Google Vertex AI，走官方计费 |

- GPT Image 系列（gpt-image-1.5、gpt-image-2）仅支持 **fal.ai** 源。
- nano-banana 系列支持 **两种源**，在 ConfigPanel 顶部的「AI 调用源」按钮切换。

---

## 新增模型需要修改的文件清单

### 情况 A：新增 fal.ai 模型（仅 fal 源）

| 文件 | 改动内容 |
|------|---------|
| `types.ts` | `ImageGenerationModel` 联合类型加新模型 ID |
| `services/apiService.ts` | `GenerateImageRequest.model` 联合类型加新模型 ID |
| `backend/src/services/falService.ts` | `GenerateImageParams` / `EditImageParams` / `editModel` 类型断言加新模型 ID |
| `backend/src/routes/images.ts` | `GenerateRequest.model` 联合类型 + `editImage` 类型断言加新模型 ID |
| `backend/src/services/costService.ts` | 注册成本默认值 + `calculateCost` 分支逻辑 |
| `components/ConfigPanel.tsx` | UI 添加模型选择按钮 |

### 情况 B：新增同时支持 fal + Vertex 的模型

在情况 A 的基础上，还需额外修改（**详细步骤与定价获取见 [新增 Vertex 类型模型（完整流程）](#新增-vertex-类型模型完整流程)**）：

| 文件 | 改动内容 |
|------|---------|
| `backend/src/services/vertexService.ts` | 在 `getFalToVertexModel()` 映射表中加入新模型 + `VertexSupportedFalModel` 类型 |
| `backend/src/services/costService.ts` | 注册 `vertex/<model-name>` 和 `vertex/<model-name>/edit` 成本（单价来自官方定价页） |
| `backend/.env` + `.env.example` | `VERTEX_MODEL_*`、`COST_VERTEX_*` |
| `types.ts` | 在 `VERTEX_SUPPORTED_MODELS` 数组中加入新模型 ID |
| `components/ConfigPanel.tsx` | 新模型按钮无需额外处理，Vertex 可用性由 `VERTEX_SUPPORTED_MODELS` 自动控制 |

> `images.ts` 通过 `isVertexSupportedModel()` 判断是否可走 Vertex，映射表在 `vertexService.ts` 维护，一般**无需**改路由文件。

---

## 逐步操作

### Step 1 · `types.ts`

```ts
export type ImageGenerationModel =
  | 'fal-ai/nano-banana'
  | 'fal-ai/nano-banana-pro'
  | 'fal-ai/gpt-image-1.5'
  | 'fal-ai/nano-banana-2'
  | 'fal-ai/gpt-image-2'
  | 'fal-ai/YOUR-NEW-MODEL';   // ← 新增

// 如果同时支持 Vertex，也加入此数组：
export const VERTEX_SUPPORTED_MODELS: ImageGenerationModel[] = [
  'fal-ai/nano-banana',
  'fal-ai/nano-banana-pro',
  'fal-ai/nano-banana-2',
  'fal-ai/YOUR-NEW-MODEL',   // ← 若支持 Vertex 则加
];
```

---

### Step 2 · `services/apiService.ts`

`GenerateImageRequest` 接口的 `model` 字段：

```ts
model:
  | 'fal-ai/nano-banana'
  | 'fal-ai/nano-banana-pro'
  | 'fal-ai/gpt-image-1.5'
  | 'fal-ai/nano-banana-2'
  | 'fal-ai/gpt-image-2'
  | 'fal-ai/YOUR-NEW-MODEL';   // ← 新增
```

> ⚠️ 这个文件**必须**和 `types.ts` 保持一致，否则 TypeScript 编译会报 `TS2322` 类型不兼容错误（部署失败）。

---

### Step 3 · `backend/src/services/falService.ts`

需要改 3 处：

**① `GenerateImageParams.model`**

```ts
export interface GenerateImageParams {
  model:
    | 'fal-ai/nano-banana'
    | ...
    | 'fal-ai/YOUR-NEW-MODEL';   // ← 新增
```

**② `EditImageParams.model`**

```ts
export interface EditImageParams {
  model:
    | 'fal-ai/nano-banana'
    | ...
    | 'fal-ai/YOUR-NEW-MODEL';   // ← 新增
```

**③ `editImage` 函数内 `editModel` 类型断言**

```ts
const editModel = `${model}/edit` as
  | 'fal-ai/nano-banana/edit'
  | ...
  | 'fal-ai/YOUR-NEW-MODEL/edit';   // ← 新增
```

**④ 如果新模型支持 `image_size` 分辨率参数，在 `generateImage` 和 `editImage` 中各加一个条件**

```ts
if (
  resolution &&
  (model === 'fal-ai/nano-banana-pro' ||
   model === 'fal-ai/nano-banana-2' ||
   model === 'fal-ai/YOUR-NEW-MODEL')  // ← 新增（仅支持分辨率的模型）
) {
  input.image_size = resolution;
}
```

---

### Step 4 · `backend/src/routes/images.ts`

需要改 2 处：

**① `GenerateRequest.model`**

```ts
interface GenerateRequest {
  model:
    | 'fal-ai/nano-banana'
    | ...
    | 'fal-ai/YOUR-NEW-MODEL';   // ← 新增
```

**② `editImage` 调用的类型断言**

```ts
model: model as
  | 'fal-ai/nano-banana'
  | ...
  | 'fal-ai/YOUR-NEW-MODEL',   // ← 新增
```

---

### Step 5 · `backend/src/services/vertexService.ts`（仅限支持 Vertex 的模型）

在 `getFalToVertexModel()` 映射表中添加：

```ts
function getFalToVertexModel(): Record<string, string> {
  return {
    'fal-ai/nano-banana':     process.env.VERTEX_MODEL_NANO_BANANA     || 'gemini-2.5-flash-image',
    'fal-ai/nano-banana-pro': process.env.VERTEX_MODEL_NANO_BANANA_PRO || 'gemini-3-pro-image-preview',
    'fal-ai/nano-banana-2':   process.env.VERTEX_MODEL_NANO_BANANA_2   || 'gemini-3.1-flash-image-preview',
    'fal-ai/YOUR-NEW-MODEL':  process.env.VERTEX_MODEL_YOUR_NEW_MODEL  || 'your-vertex-model-id',  // ← 新增
  };
}
```

同时更新 `VertexSupportedFalModel` 联合类型：

```ts
export type VertexSupportedFalModel =
  | 'fal-ai/nano-banana'
  | 'fal-ai/nano-banana-pro'
  | 'fal-ai/nano-banana-2'
  | 'fal-ai/YOUR-NEW-MODEL';   // ← 新增
```

---

### Step 6 · `backend/src/services/costService.ts`

**情况 A：固定单价模型**（如 nano-banana 系列）

在 `loadCosts()` 中注册默认值：

```ts
this.costs.set('fal-ai/YOUR-NEW-MODEL', parseFloat(process.env.COST_YOUR_NEW_MODEL || '0.05'));
this.costs.set('fal-ai/YOUR-NEW-MODEL/edit', parseFloat(process.env.COST_YOUR_NEW_MODEL_EDIT || '0.05'));
```

若同时支持 Vertex，额外注册 vertex 键（单价见下方「Vertex 定价获取」）：

```ts
// short-name = YOUR-NEW-MODEL 去掉 fal-ai/ 前缀，如 nano-banana-3
this.costs.set('vertex/YOUR-NEW-MODEL', parseFloat(process.env.COST_VERTEX_YOUR_NEW_MODEL || '0.04'));
this.costs.set('vertex/YOUR-NEW-MODEL/edit', parseFloat(process.env.COST_VERTEX_YOUR_NEW_MODEL_EDIT || '0.04'));
```

完成，`calculateCost` 里的兜底逻辑会自动命中，无需额外分支（按分辨率分档的 Vertex 模型需另加分支，见下文「新增 Vertex 类型模型」）。

---

**情况 B：按分辨率（像素尺寸）计费的模型**（如 gpt-image 系列，token 定价）

① 在 `loadCosts()` 中注册默认值（用于兜底）：

```ts
this.costs.set('fal-ai/YOUR-NEW-MODEL', 0.XX);       // 1024x1024 默认成本
this.costs.set('fal-ai/YOUR-NEW-MODEL/edit', 0.XX);
```

② 添加私有计算方法：

```ts
private calculateYourNewModelCost(width?: number, height?: number): number {
  if (!width || !height) return 0.XX;
  if (width === 1024 && height === 1024) return 0.XX;
  if ((width === 1024 && height === 1536) || (width === 1536 && height === 1024)) return 0.XX;
  return 0.XX; // 默认兜底
}
```

③ 在 `calculateCost` 中添加分支（加在其他 gpt-image 分支附近）：

```ts
if (model === 'fal-ai/YOUR-NEW-MODEL' || model === 'fal-ai/YOUR-NEW-MODEL/edit') {
  return this.calculateYourNewModelCost(width, height);
}
```

---

**情况 C：按逻辑分辨率档位计费的模型**（如 nano-banana-2，0.5K/1K/2K/4K 倍率）

① 在 `loadCosts()` 中注册基础价：

```ts
this.costs.set('fal-ai/YOUR-NEW-MODEL', parseFloat(process.env.COST_YOUR_NEW_MODEL || '0.08'));
this.costs.set('fal-ai/YOUR-NEW-MODEL/edit', parseFloat(process.env.COST_YOUR_NEW_MODEL_EDIT || '0.08'));
```

② 在 `calculateCost` 中添加分支（参考 nano-banana-2 的逻辑）：

```ts
if (model === 'fal-ai/YOUR-NEW-MODEL' || model === 'fal-ai/YOUR-NEW-MODEL/edit') {
  const base = this.costs.get(model) ?? 0.08;
  const multiplierMap: Record<string, number> = { '0.5K': 0.75, '1K': 1.0, '2K': 1.5, '4K': 2.0 };
  return base * (multiplierMap[resolution ?? '1K'] ?? 1.0);
}
```

---

**可选：在 `backend/.env` 和 `backend/.env.example` 中添加成本环境变量**

```env
COST_YOUR_NEW_MODEL=0.05
COST_YOUR_NEW_MODEL_EDIT=0.05
# 若支持 Vertex（单价从官方定价页获取，见「Vertex 定价获取」）：
VERTEX_MODEL_YOUR_NEW_MODEL=gemini-xxx-image-preview
COST_VERTEX_YOUR_NEW_MODEL=0.04
COST_VERTEX_YOUR_NEW_MODEL_EDIT=0.04
```

---

### Step 7 · `components/ConfigPanel.tsx`

在模型列表末尾（`</div>` 闭合之前）添加按钮，复制任意一个按钮模板并修改：

```tsx
<button 
    onClick={() => onSelectModel('fal-ai/YOUR-NEW-MODEL')}
    className={`w-full flex items-center p-2.5 rounded-lg border transition-all text-left group ${
        selectedModel === 'fal-ai/YOUR-NEW-MODEL' 
        ? 'bg-XXX-900/20 border-XXX-500/50 ring-1 ring-XXX-500/20'   // 选一个颜色
        : 'bg-slate-800 border-slate-700 hover:border-slate-600'
    }`}
>
    <div className={`w-8 h-8 rounded flex items-center justify-center mr-3 ${selectedModel === 'fal-ai/YOUR-NEW-MODEL' ? 'bg-XXX-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
        <i className="fa-solid fa-ICON-NAME"></i>   {/* Font Awesome 图标 */}
    </div>
    <div>
        <div className={`text-xs font-bold ${selectedModel === 'fal-ai/YOUR-NEW-MODEL' ? 'text-XXX-200' : 'text-slate-300'}`}>
            模型显示名称
        </div>
        <div className="text-[10px] text-slate-500 group-hover:text-slate-400">
            简短描述
        </div>
    </div>
</button>
```

**如果该模型不支持 Vertex**，需加 `disabled` 和 opacity 处理（参考 GPT Image 的写法）：

```tsx
<button 
    onClick={() => { if (aiSource !== 'vertex') onSelectModel('fal-ai/YOUR-NEW-MODEL'); }}
    disabled={aiSource === 'vertex'}
    className={`... ${aiSource === 'vertex' ? 'opacity-30 cursor-not-allowed bg-slate-800 border-slate-700' : ...}`}
>
```

颜色参考（避免重复使用）：

| 颜色 | 已使用模型 |
|------|-----------|
| `blue` | nano-banana |
| `purple` | nano-banana-pro |
| `green` | gpt-image-1.5 |
| `amber` | nano-banana-2 |
| `teal` | gpt-image-2 |
| `rose` / `indigo` / `cyan` / `orange` 等 | 未使用，下个模型可用 |

---

## 完整 Checklist

### fal.ai 模型

- [ ] `types.ts` — `ImageGenerationModel` 加新 ID
- [ ] `services/apiService.ts` — `GenerateImageRequest.model` 加新 ID
- [ ] `backend/src/services/falService.ts` — `GenerateImageParams` / `EditImageParams` / `editModel` 加新 ID（3 处）
- [ ] `backend/src/routes/images.ts` — `GenerateRequest.model` + `editImage` 类型断言（2 处）
- [ ] `backend/src/services/costService.ts` — 成本注册 + 计算逻辑
- [ ] `components/ConfigPanel.tsx` — UI 按钮
- [ ] `backend/.env` — 按需添加 `COST_*` 环境变量

### 额外：同时支持 Vertex AI

- [ ] `types.ts` — 新模型 ID 加入 `VERTEX_SUPPORTED_MODELS` 数组
- [ ] `backend/src/services/vertexService.ts` — `getFalToVertexModel()` 映射 + `VertexSupportedFalModel` 类型（2 处）
- [ ] `backend/src/services/costService.ts` — 注册 `vertex/<name>` 和 `vertex/<name>/edit` 成本（单价来自官方定价页）
- [ ] `backend/.env` + `backend/.env.example` — 添加 `VERTEX_MODEL_*`、`COST_VERTEX_*`（附定价来源注释）
- [ ] 确认 `VERTEX_MODEL_*` 与 `COST_VERTEX_*` 对应同一档 Gemini 模型（见下方流程）

---

## 新增 Vertex 类型模型（完整流程）

> 适用于：新产品档位需要同时走 **fal.ai** 与 **Vertex AI**，且历史记录里用 `vertex/<short-name>` 区分来源与成本。  
> GPT Image 等仅 fal 的模型**不要**走本流程。

### 1. 选定 Vertex 侧的 Gemini 模型 ID

1. 打开 [Google Gemini 定价页（Gemini 3 章节）](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing#gemini-models-3)。
2. 在 **Gemini 3** / **Gemini 2.5** / **Gemini 2.0** 表格中找到带 **Image Output** 或 **Output image** 行的图像模型。
3. 在 [Vertex AI 模型文档](https://cloud.google.com/vertex-ai/generative-ai/docs/models) 确认该模型在目标区域（默认 `us-east5`）可用，记下 API 模型 ID（如 `gemini-2.0-flash-preview-image-generation`）。
4. 将 fal 产品 ID（`fal-ai/nano-banana-xxx`）与该 Vertex 模型 ID 一一对应；**成本档位必须与 `VERTEX_MODEL_*` 一致**，否则统计成本会与 GCP 账单不符。

### 2. 从定价页读取「每张输出图」单价

定价页以 **$/1M tokens** 为主，图像模型在表格脚注中给出**按分辨率折算的单张输出图价格**，本项目 `COST_VERTEX_*` 填的就是**每张输出图（美元）**。

| 查阅位置 | 说明 |
|---------|------|
| **Gemini 3** 表格脚注 `**` / `***` | 如 Gemini 3 Pro Image、Gemini 3.1 Flash Image 的分辨率单价 |
| **Gemini 2.0** → Modality-based pricing | `Gemini 2.0 Flash Image Generation` → **Output image ($/image)** |
| **Gemini 2.5 Flash Image** 脚注 | 如 1024×1024 约 **$0.039/张**（token 折算） |

**当前项目档位与定价对照（Standard，供参考；以定价页最新值为准）：**

| fal 产品 ID | 建议 Vertex 模型 | 1K 输出图单价 | 定价页依据 |
|-------------|-----------------|--------------|-----------|
| `fal-ai/nano-banana` | Gemini 2.5 Flash Image | **$0.039** | 2.5 脚注：1024 输出约 $0.039/张 |
| `fal-ai/nano-banana-pro` | Gemini 3 Pro Image Preview | **$0.134** | 脚注 `**`：1K/2K 输出 |
| `fal-ai/nano-banana-2` | Gemini 3.1 Flash Image Preview | **$0.067** | 脚注 `***`：1K 输出（2K $0.101，4K $0.15） |

编辑模式与生成模式共用同一输出图单价，`COST_VERTEX_*` 与 `COST_VERTEX_*_EDIT` 填相同数值即可。

### 3. 改代码（按顺序）

| 步骤 | 文件 | 操作 |
|------|------|------|
| ① | 先完成上文 **情况 A** 全部步骤 | fal 类型、路由、UI 等 |
| ② | `types.ts` | `VERTEX_SUPPORTED_MODELS` 加入 `'fal-ai/YOUR-NEW-MODEL'` |
| ③ | `backend/src/services/vertexService.ts` | `getFalToVertexModel()` 增加映射；`VertexSupportedFalModel` 联合类型增加一项 |
| ④ | `backend/src/services/costService.ts` | `loadCosts()` 注册 `vertex/<short-name>`、`vertex/<short-name>/edit` |
| ⑤ | `backend/.env` + `.env.example` | `VERTEX_MODEL_*`、`COST_VERTEX_*`（注释写明定价来源 URL） |

**`vertexService.ts` 环境变量命名约定：**

- fal ID `fal-ai/nano-banana-3` → `VERTEX_MODEL_NANO_BANANA_3`（大写 + 下划线）
- 默认值写 Step 1 选定的 Gemini 模型 ID

**`costService.ts` 成本键名（由 `images.ts` 自动拼接，勿改规则）：**

- 生成：`vertex/<short-name>`（`short-name` = 去掉 `fal-ai/` 前缀）
- 编辑：`vertex/<short-name>/edit`

**若新模型按 0.5K/1K/2K/4K 分档计费**（类似 nano-banana-2 的 fal 逻辑）：

1. 在定价页脚注查出各档位单价；
2. 在 `calculateCost()` 中为 `vertex/YOUR-NEW-MODEL` 增加与 fal 类似的分支（当前仅 fal 的 `nano-banana-2` 有倍率，Vertex 路径需单独实现）。

### 4. 配置环境变量示例

```env
# Vertex 模型映射
VERTEX_MODEL_YOUR_NEW_MODEL=gemini-3.1-flash-image-preview   # 与定价档一致

# Vertex 源成本（每张输出图，美元）
# 定价来源：https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing#gemini-models-3
COST_VERTEX_YOUR_NEW_MODEL=0.067
COST_VERTEX_YOUR_NEW_MODEL_EDIT=0.067
```

`costService.ts` 中的 `parseFloat(process.env.COST_VERTEX_... || '默认值')` 应与 `.env.example` 保持一致，便于未配置 env 时仍有合理默认。

### 5. 验证

- [ ] 前端切到 **Vertex AI** 源，新模型按钮可点（由 `VERTEX_SUPPORTED_MODELS` 控制）
- [ ] 文生图 / 编辑各请求一次，历史记录 `model` 为 `vertex/<short-name>` 或 `vertex/<short-name>/edit`
- [ ] 返回的 `cost` 与配置的 `COST_VERTEX_*` 一致
- [ ] GCP 控制台账单与所选 Gemini 模型、定价档一致

### Vertex 定价获取（速查）

1. 打开：<https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing#gemini-models-3>
2. 找到目标 **Image** 模型行 → 看 **Image Output** 列与表格下方脚注 `**` / `***`
3. 取业务默认分辨率（通常 **1K**）对应的 **$/张** 填入 `COST_VERTEX_*`
4. 同步更新 `costService.ts` 默认值与 `.env.example` 注释

> 定价会随 Google 调整而变化，以定价页实时内容为准，勿依赖本文档中的具体数字。

---

## Vertex AI 环境配置

使用 Vertex 源前，需在 `backend/.env` 中配置：

```env
VERTEX_AI_PROJECT=your-gcp-project-id
VERTEX_AI_LOCATION=us-east5
# 本地开发用服务账号：
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

服务账号需要 `Vertex AI User` IAM 角色。

---

## 常见报错

**`TS2322: Type 'ImageGenerationModel' is not assignable to type '...'`**

原因：`services/apiService.ts` 里的 `GenerateImageRequest.model` 没有同步更新，与 `types.ts` 中的 `ImageGenerationModel` 不一致。按 Step 2 补全即可。

**`模型 X 不支持 Vertex AI 调用`**

原因：前端传入了 `aiSource: 'vertex'` 但模型不在 `getFalToVertexModel()` 映射表中。
- 若要支持该模型的 Vertex 调用，按「额外：同时支持 Vertex AI」Checklist 操作。
- 若该模型不支持 Vertex，前端 `ConfigPanel.tsx` 应将其按钮设为 `disabled={aiSource === 'vertex'}`。

**`VERTEX_AI_PROJECT（或 GCP_PROJECT）环境变量是必填项`**

原因：未在 `backend/.env` 中配置 GCP 项目 ID。参考上方「Vertex AI 环境配置」补全即可。
