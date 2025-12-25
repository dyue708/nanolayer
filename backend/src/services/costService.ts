export class CostService {
  private costs: Map<string, number>;

  constructor() {
    this.costs = new Map();
    this.loadCosts();
  }

  private loadCosts() {
    this.costs.set('fal-ai/nano-banana', parseFloat(process.env.COST_NANO_BANANA || '0.0396'));
    this.costs.set('fal-ai/nano-banana-pro', parseFloat(process.env.COST_NANO_BANANA_PRO || '0.134'));
    this.costs.set('fal-ai/nano-banana/edit', parseFloat(process.env.COST_NANO_BANANA_EDIT || '0.0396'));
    this.costs.set('fal-ai/nano-banana-pro/edit', parseFloat(process.env.COST_NANO_BANANA_PRO_EDIT || '0.134'));
    // gpt-image-1.5 的成本基于分辨率，这里设置默认值（实际会通过 calculateCostWithDimensions 计算）
    this.costs.set('fal-ai/gpt-image-1.5', 0.133); // 默认 1024x1024 的成本
    this.costs.set('fal-ai/gpt-image-1.5/edit', 0.133); // 默认 1024x1024 的成本
  }

  /**
   * 根据模型名称计算成本
   * @param model 模型名称
   * @param width 图片宽度（可选，用于基于分辨率的成本计算）
   * @param height 图片高度（可选，用于基于分辨率的成本计算）
   */
  calculateCost(model: string, width?: number, height?: number): number {
    // gpt-image-1.5 模型使用基于分辨率的成本计算
    if (model === 'fal-ai/gpt-image-1.5' || model === 'fal-ai/gpt-image-1.5/edit') {
      return this.calculateCostWithDimensions(width, height);
    }

    const cost = this.costs.get(model);
    if (cost === undefined) {
      console.warn(`Unknown model: ${model}, using default cost 0.0396`);
      return 0.0396;
    }
    return cost;
  }

  /**
   * 根据图片尺寸计算 gpt-image-1.5 模型的成本
   * - 1024x1024: $0.133
   * - 1024x1536 或 1536x1024: $0.200
   * - 其他尺寸：使用默认值 $0.133
   */
  private calculateCostWithDimensions(width?: number, height?: number): number {
    if (!width || !height) {
      // 如果没有提供尺寸，使用默认成本
      return 0.133;
    }

    // 1024x1024: $0.133
    if (width === 1024 && height === 1024) {
      return 0.133;
    }

    // 1024x1536 或 1536x1024: $0.200
    if ((width === 1024 && height === 1536) || (width === 1536 && height === 1024)) {
      return 0.200;
    }

    // 其他尺寸：使用默认值 $0.133
    // 可以根据需要添加更多尺寸的成本计算
    console.warn(`Unknown dimensions for gpt-image-1.5: ${width}x${height}, using default cost 0.133`);
    return 0.133;
  }

  /**
   * 根据基础模型和是否为编辑模式计算成本
   * @param baseModel 基础模型名称
   * @param isEdit 是否为编辑模式
   * @param width 图片宽度（可选，用于基于分辨率的成本计算）
   * @param height 图片高度（可选，用于基于分辨率的成本计算）
   */
  calculateCostByModel(baseModel: string, isEdit: boolean, width?: number, height?: number): number {
    const modelKey = isEdit ? `${baseModel}/edit` : baseModel;
    return this.calculateCost(modelKey, width, height);
  }
}

export const costService = new CostService();

