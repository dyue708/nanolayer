/** 与 API / fal / Vertex 一致的支持比例 */
export type SupportedAspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '3:1' | '1:3';

type RatioPattern = {
  ratio: SupportedAspectRatio;
  patterns: RegExp[];
};

const RATIO_PATTERNS: RatioPattern[] = [
  {
    ratio: '16:9',
    patterns: [
      /\b16\s*[:：比\/xX×]\s*9\b/gi,
      /(?:宽高比|长宽比|比例)[^\n]{0,12}16\s*[:：比\/]\s*9/gi,
      /(?:输出|生成|做成|采用|使用)[^\n]{0,16}(?:横屏|宽屏|16\s*[:：比\/]\s*9)/gi,
      /\b(?:landscape|widescreen)\b/gi,
      /横屏(?:比例|画幅|尺寸)?/gi,
      /宽屏(?:比例|画幅)?/gi,
    ],
  },
  {
    ratio: '9:16',
    patterns: [
      /\b9\s*[:：比\/xX×]\s*16\b/gi,
      /(?:宽高比|长宽比|比例)[^\n]{0,12}9\s*[:：比\/]\s*16/gi,
      /(?:输出|生成|做成|采用|使用)[^\n]{0,16}(?:竖屏|9\s*[:：比\/]\s*16)/gi,
      /\bportrait\b/gi,
      /竖屏(?:比例|画幅|尺寸)?/gi,
      /短视频比例|抖音比例|手机全屏比例/gi,
    ],
  },
  {
    ratio: '1:1',
    patterns: [
      /\b1\s*[:：比\/xX×]\s*1\b/gi,
      /正方形|方图|方形画幅/gi,
      /\bsquare\b/gi,
    ],
  },
  {
    ratio: '4:3',
    patterns: [/\b4\s*[:：比\/xX×]\s*3\b/gi],
  },
  {
    ratio: '3:4',
    patterns: [/\b3\s*[:：比\/xX×]\s*4\b/gi],
  },
  {
    ratio: '3:1',
    patterns: [
      /\b3\s*[:：比\/xX×]\s*1\b/gi,
      /超宽(?:屏|画幅|横幅)|全景横幅|banner\s*比例/gi,
    ],
  },
  {
    ratio: '1:3',
    patterns: [/\b1\s*[:：比\/xX×]\s*3\b/gi, /超高(?:屏|画幅|竖条)/gi],
  },
];

/** 匹配位置前若出现否定词，则忽略（如「不要横屏」） */
function isNegatedAt(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - 10), index);
  return /(?:不要|别|非|不是|无需|避免|不考虑|无需|exclude|not|no|without)\s*$/i.test(before);
}

/**
 * 从用户提示词中解析宽高比要求；多处出现时取最后一次有效匹配。
 */
export function detectAspectRatioFromPrompt(prompt: string): SupportedAspectRatio | undefined {
  if (!prompt?.trim()) return undefined;

  const hits: Array<{ ratio: SupportedAspectRatio; index: number }> = [];

  for (const { ratio, patterns } of RATIO_PATTERNS) {
    for (const pattern of patterns) {
      const re = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null;
      while ((match = re.exec(prompt)) !== null) {
        if (match.index !== undefined && !isNegatedAt(prompt, match.index)) {
          hits.push({ ratio, index: match.index });
        }
      }
    }
  }

  if (hits.length === 0) return undefined;
  hits.sort((a, b) => a.index - b.index);
  return hits[hits.length - 1].ratio;
}

export function resolveAspectRatio(
  explicit: SupportedAspectRatio | undefined,
  prompt: string
): {
  aspectRatio?: SupportedAspectRatio;
  /** 是否由提示词解析得到（用于在编辑 Rules 中补充输出要求） */
  fromPrompt: boolean;
} {
  if (explicit) {
    return { aspectRatio: explicit, fromPrompt: false };
  }
  const detected = detectAspectRatioFromPrompt(prompt);
  if (detected) {
    return { aspectRatio: detected, fromPrompt: true };
  }
  return { fromPrompt: false };
}
