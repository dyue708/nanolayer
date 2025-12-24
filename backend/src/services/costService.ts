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
  }

  /**
   * 根据模型名称计算成本
   */
  calculateCost(model: string): number {
    const cost = this.costs.get(model);
    if (cost === undefined) {
      console.warn(`Unknown model: ${model}, using default cost 0.0396`);
      return 0.0396;
    }
    return cost;
  }

  /**
   * 根据基础模型和是否为编辑模式计算成本
   */
  calculateCostByModel(baseModel: string, isEdit: boolean): number {
    const modelKey = isEdit ? `${baseModel}/edit` : baseModel;
    return this.calculateCost(modelKey);
  }
}

export const costService = new CostService();

