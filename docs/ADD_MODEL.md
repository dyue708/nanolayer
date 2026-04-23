# 新增模型操作文档

> 每次新增模型，按顺序改以下 6 个文件即可，缺一不可。

---

## 需要修改的文件清单

| 文件 | 改动内容 |
|------|---------|
| `types.ts` | `ImageGenerationModel` 联合类型加新模型 ID |
| `services/apiService.ts` | `GenerateImageRequest.model` 联合类型加新模型 ID |
| `backend/src/services/falService.ts` | `GenerateImageParams` / `EditImageParams` / `editModel` 类型断言加新模型 ID |
| `backend/src/routes/images.ts` | `GenerateRequest.model` 联合类型 + `editImage` 类型断言加新模型 ID |
| `backend/src/services/costService.ts` | 注册成本默认值 + `calculateCost` 分支逻辑 |
| `components/ConfigPanel.tsx` | UI 添加模型选择按钮 |

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
// generateImage 函数内
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

### Step 5 · `backend/src/services/costService.ts`

**情况 A：固定单价模型**（如 nano-banana 系列）

在 `loadCosts()` 中注册默认值：

```ts
this.costs.set('fal-ai/YOUR-NEW-MODEL', parseFloat(process.env.COST_YOUR_NEW_MODEL || '0.05'));
this.costs.set('fal-ai/YOUR-NEW-MODEL/edit', parseFloat(process.env.COST_YOUR_NEW_MODEL_EDIT || '0.05'));
```

完成，`calculateCost` 里的兜底逻辑会自动命中，无需额外分支。

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
```

---

### Step 6 · `components/ConfigPanel.tsx`

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

添加新模型时，逐一打勾确认：

- [ ] `types.ts` — `ImageGenerationModel` 加新 ID
- [ ] `services/apiService.ts` — `GenerateImageRequest.model` 加新 ID
- [ ] `backend/src/services/falService.ts` — `GenerateImageParams` / `EditImageParams` / `editModel` 加新 ID（3 处）
- [ ] `backend/src/routes/images.ts` — `GenerateRequest.model` + `editImage` 类型断言（2 处）
- [ ] `backend/src/services/costService.ts` — 成本注册 + 计算逻辑
- [ ] `components/ConfigPanel.tsx` — UI 按钮
- [ ] `backend/.env` — 按需添加 `COST_*` 环境变量
- [ ] 本地 `npm run build` 或 `tsc` 验证无编译错误后再部署

---

## 常见报错

**`TS2322: Type 'ImageGenerationModel' is not assignable to type '...'`**

原因：`services/apiService.ts` 里的 `GenerateImageRequest.model` 没有同步更新，与 `types.ts` 中的 `ImageGenerationModel` 不一致。按 Step 2 补全即可。
