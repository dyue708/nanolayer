
export interface PromptExample {
  id: string;
  title: string;
  titleZh?: string;
  description: string;
  descriptionZh?: string;
  prompt: string;
  promptZh?: string;
  imageSrc: string;
  requiresImage?: boolean;
}

export const PROMPT_EXAMPLES: PromptExample[] = [
  {
    id: '1.1',
    title: 'Hyper-Realistic Crowd',
    titleZh: '超写实人群',
    description: 'Complex compositions with multiple faces and specific lighting.',
    descriptionZh: '包含多张面孔和特定光照的复杂构图。',
    imageSrc: 'https://github.com/user-attachments/assets/3a056a8d-904e-4b3e-b0d2-b5122758b7f5',
    prompt: "Create a hyper-realistic, ultra-sharp, large-format image. Style: Photorealistic, 8k, shallow depth of field, soft natural fill light + strong golden rim light. High dynamic range, calibrated color grading. Skin tones perfectly accurate. Crisp fabric detail. Environment: A luxurious open-air rooftop terrace at sunset. Subject: A massive group of celebrities standing together in a cinematic frame.",
    promptZh: "创作一张超写实、极其清晰的大画幅图像。风格：照片写实，8k分辨率，浅景深，柔和的自然补光+强烈的金色轮廓光。高动态范围，校准的色彩分级。肤色精准。织物细节清晰。环境：日落时分的豪华露天屋顶露台。主体：一大群名人站在电影般的画面中。",
    requiresImage: false
  },
  {
    id: '1.2',
    title: '2000s Mirror Selfie',
    titleZh: '2000年代复古自拍',
    description: 'Authentic early-2000s aesthetic with flash photography.',
    descriptionZh: '真实的2000年代早期审美与闪光灯摄影风格。',
    imageSrc: 'https://github.com/user-attachments/assets/b71755dc-ff33-4872-8161-3f5066e0ccb6',
    prompt: "Style: 2000s Mirror Selfie aesthetic. Camera: Early-2000s digital camera, harsh super-flash with bright blown-out highlights. Texture: Subtle grain, retro highlights, soft shadows. Atmosphere: Nostalgic early-2000s vibe. Subject: A young woman taking a mirror selfie in a messy bedroom.",
    promptZh: "风格：2000年代镜面自拍美学。相机：2000年代早期的数码相机，刺眼的超级闪光灯，高光溢出。质感：微妙的颗粒感，复古高光，柔和的阴影。氛围：怀旧的2000年代早期氛围。主体：一位年轻女子在凌乱的卧室里对着镜子自拍。",
    requiresImage: true
  },
  {
    id: '1.3',
    title: 'Victoria\'s Secret Style',
    titleZh: '维密秀场风格',
    description: 'High-glamour, backstage-style fashion photography.',
    descriptionZh: '极致迷人、后台风格的时尚摄影。',
    imageSrc: 'https://github.com/user-attachments/assets/963c0a46-cf86-4604-8782-524b94afc51d',
    prompt: "Style: Victoria's Secret Fashion Show Backstage. Lighting: Flash photography emphasizing shine of beads and skin. Mood: Sensuality, luxury, glamour. Maintain facial features 100% accurate to the reference. Subject: A glamorous backstage photo of the subject wearing a corset decorated with beads and crystals, and large feather wings. Makeup artists are applying lipstick.",
    promptZh: "风格：维多利亚的秘密时尚秀后台。光线：闪光灯摄影，强调珠子和皮肤的光泽。氛围：感性、奢华、魅力。保持面部特征与参考图100%一致。主体：一张迷人的后台照片，模特身穿装饰有珠子和水晶的紧身胸衣，戴着巨大的羽毛翅膀。化妆师正在涂口红。",
    requiresImage: true
  },
  {
    id: '1.4',
    title: '1990s Camera Style',
    titleZh: '90年代胶片风格',
    description: 'Replicate film textures and flash photography.',
    descriptionZh: '复刻胶片质感与闪光灯摄影效果。',
    imageSrc: 'https://github.com/user-attachments/assets/eca5066b-1bf6-4a97-8b81-63e9e7435050',
    prompt: "Style: 1990s-style camera with direct front flash (35mm lens). Texture: Film grain, nostalgic glow. Background: Dark wall with posters, dim lighting. Preserve original face. Subject: Portrait of the subject with messy dark brown hair tied up, posing with a calm smile. Wearing an oversized cream sweater.",
    promptZh: "风格：90年代风格相机，直接前置闪光灯（35mm镜头）。质感：胶片颗粒，怀旧光晕。背景：贴满海报的暗墙，昏暗的灯光。保留原始面孔。主体：肖像，凌乱的深棕色头发扎起来，带着平静的微笑摆姿势。穿着超大号的奶油色毛衣。",
    requiresImage: true
  },
  {
    id: '1.5',
    title: 'Business Headshot',
    titleZh: '商务职业头像',
    description: 'Professional silicon valley style studio headshot.',
    descriptionZh: '专业硅谷风格的影棚职业头像。',
    imageSrc: 'https://github.com/user-attachments/assets/793ad242-7867-4709-bdc6-55021f5eb78f',
    prompt: "Style: Silicon Valley Professional Headshot. Camera: Sony A7III, 85mm f/1.4 lens. Lighting: Classic three-point lighting, soft key light, subtle rim light. Background: Clean, solid dark gray studio backdrop with vignette. Details: Natural skin texture (no airbrushing), natural catchlights. Subject: A professional headshot of the subject wearing a navy blue business suit and white shirt.",
    promptZh: "风格：硅谷专业头像。相机：Sony A7III，85mm f/1.4 镜头。布光：经典三点布光，柔和的主光，微妙的轮廓光。背景：干净、纯深灰色的摄影棚背景，带有晕影。细节：自然的皮肤纹理（无磨皮），自然的眼神光。主体：身穿海军蓝商务西装和白衬衫的专业头像。",
    requiresImage: true
  },
  {
    id: '1.6',
    title: 'Emotional Film Photo',
    titleZh: '情绪感胶片摄影',
    description: 'Cinematic, nostalgic "Kodak Portra" look.',
    descriptionZh: '电影感、怀旧的 "Kodak Portra" 胶卷质感。',
    imageSrc: 'https://github.com/user-attachments/assets/243d1b11-9ef0-4d4f-b308-97d67b5d3bc3',
    prompt: "Style: Kodak Portra 400 film. Setting: Urban coffee shop window at Golden Hour (sunset). Atmosphere: Dreamy, storytelling vibe, subtle film grain, soft focus. Details: Bokeh background of city lights. Subject: Cinematic portrait of the subject looking slightly away, holding a coffee cup.",
    promptZh: "风格：Kodak Portra 400 胶片。场景：日落黄金时段的城市咖啡店橱窗。氛围：梦幻、叙事感，微妙的胶片颗粒，柔焦。细节：城市灯光的散景背景。主体：电影感的肖像，稍微看向别处，手里拿着咖啡杯。",
    requiresImage: true
  },
  {
    id: '1.7',
    title: 'Pro Headshot Creator',
    titleZh: '专业头像生成器',
    description: 'Create a professional profile photo from a selfie.',
    descriptionZh: '将普通自拍转变为专业的个人资料照片。',
    imageSrc: 'https://pbs.twimg.com/media/G6x00O_XIAASY0r?format=jpg&name=900x900',
    prompt: "Maintain exact facial structure and identity. Style: Professional photo studio shoot. Outfit: Premium smart casual blazer (charcoal gray). Background: Solid #562226 neutral studio color. Lighting: Bright, airy, soft diffused studio lighting. Camera: 85mm f/1.8 lens, shallow depth of field, focus on eyes. Subject: A professional profile photo of the subject, framed from chest up.",
    promptZh: "保持完全相同的面部结构和身份特征。风格：专业摄影棚拍摄。服装：高级商务休闲西装（炭灰色）。背景：纯色 #562226 中性影棚背景色。光线：明亮、通风、柔和的漫射影棚光。相机：85mm f/1.8 镜头，浅景深，聚焦于眼睛。主体：专业的个人资料照片，取景至胸部以上。",
    requiresImage: true
  },
  {
    id: '1.8',
    title: 'Anime Spotlight',
    titleZh: '聚光灯下的动漫肖像',
    description: 'Hyperrealistic anime-style portrait with dramatic lighting.',
    descriptionZh: '具有戏剧性光影的超写实动漫风格肖像。',
    imageSrc: 'https://pbs.twimg.com/media/G7Ah9SIbIAAGlyu?format=jpg&name=900x900',
    prompt: "Lighting: Narrow beam spotlight focused only on center of face. Sharp, dramatic edges. High falloff shadow. Style: Dark, moody, mysterious. Clothing blends into darkness. Subject: A hyperrealistic realistic-anime portrait of a female character standing in a completely black background. One hand raised gently to lips.",
    promptZh: "光线：聚焦于面部中心的窄光束聚光灯。边缘锐利、戏剧化。高衰减阴影。风格：黑暗、情绪化、神秘。衣服融入黑暗中。主体：站在全黑背景中的超写实动漫女性角色肖像。一只手轻轻举到嘴边。",
    requiresImage: false
  },
  {
    id: '1.9',
    title: 'Bathroom Mirror Selfie',
    titleZh: '浴室镜面自拍',
    description: 'Candid mirror selfie with specific styling.',
    descriptionZh: '具有特定造型和构图的抓拍风格镜面自拍。',
    imageSrc: 'https://pbs.twimg.com/media/G7PebGOW8AALh2P?format=jpg&name=large',
    prompt: "Style: Casual iPhone mirror selfie, social media quality. Vibe: 'Innocent face but devil body'. Lighting: Good vanity lighting. Background: Regular apartment bathroom, white subway tiles. Subject: Young woman taking a bathroom mirror selfie. Wearing a mini crop tee and tight tennis skirt.",
    promptZh: "风格：随意的 iPhone 镜面自拍，社交媒体画质。氛围：“天使面孔，魔鬼身材”。光线：良好的梳妆台照明。背景：普通公寓浴室，白色地铁砖。主体：年轻女子在浴室对着镜子自拍。穿着迷你露脐T恤和紧身网球裙。",
    requiresImage: true
  },
  {
    id: '1.10',
    title: 'Chalkboard Anime Art',
    titleZh: '黑板动漫艺术',
    description: 'Photorealistic documentation of chalkboard art.',
    descriptionZh: '写实风格的黑板画记录。',
    imageSrc: 'https://pbs.twimg.com/media/G65Uh3ebkAEqbv5?format=jpg&name=medium',
    prompt: "Style: Documentary realism. Medium: Chalk on green blackboard. Texture: Dusty, matte chalk quality, visible hatching. Lighting: Diffuse ambient classroom lighting. Perspective: Eye-level, including teacher's desk in foreground. Subject: Photorealistic photo of a chalkboard drawing of an anime character in a classroom.",
    promptZh: "风格：纪录片写实主义。媒介：绿色黑板上的粉笔画。质感：多尘、哑光粉笔质感，可见排线。光线：漫射的教室环境光。视角：视平线，前景包含讲台。主体：教室里动漫角色黑板画的写实照片。",
    requiresImage: false
  },
  {
    id: '1.11',
    title: 'Portrait with Puppy in Snow',
    titleZh: '雪地小狗人像',
    description: 'Create a winter portrait with a puppy',
    descriptionZh: '创作一张带有小狗的冬季人像。',
    imageSrc: 'https://pbs.twimg.com/media/G6qMd2abwAA-hAi?format=jpg&name=900x900',
    prompt: "Preserve facial features exactly. Environment: Outdoors, winter, snow covering ground. Mood: Cute, natural. Camera: Soft depth of field, natural daylight. Subject: Winter portrait of the subject with a small white puppy.",
    promptZh: "精准保留面部特征。环境：户外，冬季，地面覆盖着雪。氛围：可爱，自然。相机：浅景深，自然日光。主体：带有小白狗的冬季人像。",
    requiresImage: true
  },
  {
    id: '1.12',
    title: 'Fisheye Movie Character Selfie',
    titleZh: '鱼眼电影角色自拍',
    description: 'A 360-degree selfie with movie characters',
    descriptionZh: '与电影角色一起的360度全景自拍。',
    imageSrc: 'https://pbs.twimg.com/media/G7Q6stnXIAAe7Vz?format=jpg&name=small',
    prompt: "Lens: Vintage 35mm fisheye, heavy barrel distortion. Lighting: Harsh direct on-camera flash, hard shadows. Texture: Authentic film grain, chromatic aberration. Vibe: Chaotic behind-the-scenes snapshot. Subject: A film-like fisheye 360-degree selfie of the subject with movie characters.",
    promptZh: "镜头：复古35mm鱼眼镜头，严重的桶形畸变。光线：刺眼的机顶直闪，硬阴影。质感：真实的胶片颗粒，色差。氛围：混乱的幕后抓拍。主体：像电影一样的鱼眼360度自拍，与电影角色合影。",
    requiresImage: true
  },
  {
    id: '1.13',
    title: 'Character Consistency Selfie',
    titleZh: '角色一致性自拍',
    description: 'Take a selfie with a movie character while preserving your features',
    descriptionZh: '在保持个人面部特征的同时与电影角色自拍。',
    imageSrc: 'https://pbs.twimg.com/media/G7HwgjGaYAAgJ67?format=jpg&name=small',
    prompt: "Keep the person exactly as shown in the reference image with 100% identical facial features, bone structure, skin tone, facial expression. Quality: 4K detail. Subject: I'm taking a selfie with a movie character on a movie set.",
    promptZh: "保持人物与参考图像完全一致，100%相同的面部特征、骨骼结构、肤色、面部表情。画质：4K细节。主体：我正在电影片场与电影角色自拍。",
    requiresImage: true
  },
  {
    id: '1.14',
    title: 'Museum Art Exhibition Selfie',
    titleZh: '博物馆艺术展自拍',
    description: 'A commercial-grade photo with a classical oil painting',
    descriptionZh: '在古典油画前拍摄的商业级自拍照。',
    imageSrc: 'https://pbs.twimg.com/media/G7N2KUIbMAAspf6?format=jpg&name=900x900',
    prompt: "Style: Commercial grade photography. Painting Style: Traditional oil painting, thick impasto brushstrokes. Lighting: Gallery spotlights, dramatic shadows. Quality: 8K UHD. Subject: Photo of the subject posing inside a high-end museum exhibition space. Behind them hangs a large classical oil painting of themselves.",
    promptZh: "风格：商业级摄影。绘画风格：传统油画，厚重的厚涂笔触。光线：画廊聚光灯，戏剧性阴影。画质：8K UHD。主体：在高端博物馆展览空间内摆姿势的照片。身后挂着一幅他们自己的大型古典油画。",
    requiresImage: true
  },
  {
    id: '1.15',
    title: 'Compact Camera Screen Display',
    titleZh: '相机屏幕实拍效果',
    description: 'A photo displayed on a compact digital camera screen',
    descriptionZh: '模拟复古数码相机屏幕上显示的照片效果。',
    imageSrc: 'https://pbs.twimg.com/media/G7NVohbbgAcUFBe?format=jpg&name=900x900',
    prompt: "Context: Camera body visible (buttons, dials). Screen image: Illuminated by bright built-in flash, nostalgic early 2000s snapshot. Lighting: Harsh direct flash on subject, ambient low light background. Color Grading: Nostalgic digital-camera tones, high contrast flash. Subject: A close-up shot of the subject displayed on the screen of a compact Canon digital camera.",
    promptZh: "语境：相机机身可见（按钮、拨盘）。屏幕图像：被明亮的内置闪光灯照亮，怀旧的2000年代早期快照。光线：对主体的刺眼直闪，背景为低环境光。调色：怀旧数码相机色调，高对比度闪光。主体：紧凑型佳能数码相机屏幕上显示的主体特写镜头。",
    requiresImage: true
  },
  {
    id: '1.16',
    title: 'Magazine Cover Portrait',
    titleZh: '杂志封面人像',
    description: 'Create a glossy magazine cover',
    descriptionZh: '制作一张光面杂志封面图。',
    imageSrc: 'https://pbs.twimg.com/media/G7QmCFcXoAAwaet?format=jpg&name=large',
    prompt: "Design: Serif font, black on white. Elements: Issue number, date, barcode, price. Environment: Magazine standing on a white shelf against a wall. Subject: A photo of a glossy magazine cover titled 'Nano Banana Pro'. In front of the text is a dynamic portrait of the subject.",
    promptZh: "设计：衬线字体，黑底白字。元素：期号、日期、条形码、价格。环境：立在靠墙白色架子上的杂志。主体：一张名为 'Nano Banana Pro' 的光面杂志封面照片。文字前方是充满活力的主体肖像。",
    requiresImage: true
  },
  {
    id: '1.17',
    title: 'Luxury Product Photography',
    titleZh: '奢华产品摄影',
    description: 'Create a floating luxury product shot',
    descriptionZh: '创作一张悬浮的奢华产品摄影图。',
    imageSrc: 'https://raw.githubusercontent.com/ZeroLu/awesome-nanobanana-pro/refs/heads/main/assets/luxury-product-shot.jpg',
    prompt: "Style: High-end commercial photography. Lighting: Golden hour glow, reflections on water. Mood: Ethereal and luxurious. Camera: Shallow depth of field, soft bokeh. Subject: Luxury product shot of a bottle floating on dark water with flowers arranged around it.",
    promptZh: "风格：高端商业摄影。光线：黄金时段的光辉，水面反射。氛围：空灵且奢华。相机：浅景深，柔和散景。主体：漂浮在深色水面上的奢华瓶子产品照，周围摆放着鲜花。",
    requiresImage: false
  },
  {
    id: '2.1',
    title: 'Star Wars "Where\'s Waldo"',
    titleZh: '星球大战版“威利在哪里”',
    description: 'Dense crowd composition.',
    descriptionZh: '密集人群构图。',
    imageSrc: 'https://github.com/user-attachments/assets/439317c2-4be8-4b28-803f-36427ecca31e',
    prompt: "Style: Detailed illustration/crowd photography. Content: Extremely dense crowd of Star Wars characters. Include Waldo hidden somewhere. Subject: A 'Where is Waldo' style image showing all Star Wars characters on Tatooine.",
    promptZh: "风格：详细插图/人群摄影。内容：极其密集的星球大战角色人群。将威利（Waldo）隐藏在某处。主体：一张“威利在哪里”风格的图片，展示塔图因星球上的所有星球大战角色。",
    requiresImage: false
  },
  {
    id: '2.2',
    title: 'Aging Through the Years',
    titleZh: '岁月变迁（年龄变化）',
    description: 'Demonstrates temporal consistency.',
    descriptionZh: '展示时间一致性。',
    imageSrc: 'https://github.com/user-attachments/assets/74fced67-0715-46d3-b788-d9ed9e98873b',
    prompt: "Task: Age progression. Maintain identity perfectly but apply aging effects (wrinkles, grey hair) consistent with an 80 year old. Subject: Generate a holiday photo of this person at age 80.",
    promptZh: "任务：年龄演变。完美保持身份特征，但应用符合80岁老人的衰老效果（皱纹、白发）。主体：生成此人80岁时的节日照片。",
    requiresImage: true
  },
  {
    id: '2.3',
    title: 'Recursive Visuals',
    titleZh: '递归视觉效果',
    description: 'Infinite loop logic (Droste effect).',
    descriptionZh: '无限循环逻辑（德罗斯特效应）。',
    imageSrc: 'https://github.com/user-attachments/assets/f7ef5a84-e2bf-4d4e-a93e-38a23a21b9ef',
    prompt: "Style: Realistic. Effect: Droste effect / Infinite recursion. Subject: Recursive image of an orange cat sitting in an office chair holding up an iPad. On the iPad is the same cat in the same scene holding up the same iPad.",
    promptZh: "风格：写实。效果：德罗斯特效应 / 无限递归。主体：一只橘猫坐在办公椅上举着 iPad 的递归图像。在 iPad 上是同一只猫在同一场景中举着同一个 iPad。",
    requiresImage: false
  },
  {
    id: '2.4',
    title: 'Coordinate Visualization',
    titleZh: '经纬度可视化',
    description: 'Generates location from coordinates.',
    descriptionZh: '仅基于经纬度坐标生成。',
    imageSrc: 'https://github.com/user-attachments/assets/8629b88a-b872-43e2-a19e-855542702ac2',
    prompt: "Task: Interpret geolocation coordinates and render the specific location and time of day photorealistically. Subject: 35.6586° N, 139.7454° E at 19:00",
    promptZh: "任务：解释地理定位坐标并以照片级写实的方式渲染特定位置和时间。主体：北纬 35.6586°，东经 139.7454°，时间 19:00。",
    requiresImage: false
  },
  {
    id: '2.5',
    title: 'Conceptual Visualization',
    titleZh: '概念可视化',
    description: 'Interpretative rendering.',
    descriptionZh: '诠释性渲染。',
    imageSrc: 'https://github.com/user-attachments/assets/761380fe-0850-49e2-8589-797f10b7cb8d',
    prompt: "Style: Conceptual art / Blueprint overlay / Technical visualization. Subject: How engineers see the San Francisco Bridge",
    promptZh: "风格：概念艺术 / 蓝图叠加 / 技术可视化。主体：工程师眼中的旧金山大桥。",
    requiresImage: false
  },
  {
    id: '2.6',
    title: 'Literal Interpretation',
    titleZh: '文字直译可视化',
    description: 'Interprets a filename as a visual subject.',
    descriptionZh: '将文件名直接解释为视觉主体。',
    imageSrc: 'https://replicate.delivery/xezq/piAS0s9DshbqMFXJvIfw9feWaEaNsejlRifhVgMSflvZJzzaF/tmp3u2ym4f_.jpeg',
    prompt: "Task: Literal visual interpretation of the filename. Subject: rare.jpg",
    promptZh: "任务：文件名的字面视觉解释。主体：rare.jpg (罕见.jpg / 三分熟.jpg)",
    requiresImage: false
  },
  {
    id: '2.7',
    title: 'Multi-Subject Compositing',
    titleZh: '多主体合成',
    description: 'Combines multiple input portraits.',
    descriptionZh: '将多张输入肖像合成。',
    imageSrc: 'https://github.com/user-attachments/assets/54e2a2eb-1ab4-4f2b-86a2-7a59856e615f',
    prompt: "Task: Group composition. Combine subjects into a cohesive environment. Subject: An office team photo, everyone making a silly face.",
    promptZh: "任务：团队构图。将主体组合到一个连贯的环境中。主体：一张办公室团队合影，每个人都做着鬼脸。",
    requiresImage: true
  },
  {
    id: '2.8',
    title: 'Whiteboard Marker Art',
    titleZh: '白板马克笔艺术',
    description: 'Simulating marker on glass.',
    descriptionZh: '模拟玻璃上的马克笔痕迹。',
    imageSrc: 'https://github.com/user-attachments/assets/b399c4d9-151b-4e15-9a40-f092f7a892b9',
    prompt: "Style: Whiteboard art. Medium: Faded green marker on glass. Texture: Glossy reflection, imperfect lines. Subject: Photo of a samurai praying drawn on a glass whiteboard in a slightly faded green marker.",
    promptZh: "风格：白板艺术。媒介：玻璃上的褪色绿色马克笔。质感：光泽反射，不完美的线条。主体：用略微褪色的绿色马克笔在玻璃白板上画的武士祈祷照片。",
    requiresImage: false
  },
  {
    id: '2.9',
    title: 'Split View 3D Render',
    titleZh: '分屏 3D 渲染',
    description: 'Realism vs Wireframe split.',
    descriptionZh: '写实与线框图的分割视图。',
    imageSrc: 'https://pbs.twimg.com/media/G7LmGCQWYAAfp47?format=jpg&name=small',
    prompt: "Composition: Split View. Left Half: Full Realism (opaque, accurate materials). Right Half: Hard Cut Wireframe Interior (white lines, engineering style). Boundary: Vertical sharp cut. Background: Minimalist dark. Subject: A high-quality 3D render of an Orange iPhone 17 Pro floating in mid-air.",
    promptZh: "构图：分屏视图。左半部分：完全写实（不透明，材质精准）。右半部分：硬切线框内部（白线，工程风格）。边界：垂直锐利切割。背景：极简暗色。主体：漂浮在空中的橙色 iPhone 17 Pro 的高质量 3D 渲染。",
    requiresImage: false
  },
  {
    id: '2.10',
    title: 'USA 3D Diorama',
    titleZh: '美国地标 3D 透视模型',
    description: 'Isometric 3D diorama.',
    descriptionZh: '等距 3D 透视模型。',
    imageSrc: 'https://pbs.twimg.com/media/G7LGpq0XAAAxcIP?format=jpg&name=medium',
    prompt: "Style: Cute, polished 3D isometric diorama. Colors: Soft pastel. Materials: Clean, smooth, gentle shadows. Layout: Accurate geography. Subject: High-detail 3D isometric diorama of the United States with miniature landmarks.",
    promptZh: "风格：可爱的、抛光的 3D 等距透视模型。颜色：柔和的粉彩。材质：干净、光滑、柔和的阴影。布局：精准的地理分布。主体：带有微缩地标的美国高细节 3D 等距透视模型。",
    requiresImage: false
  },
  {
    id: '2.11',
    title: 'US Food Map',
    titleZh: '美国美食地图',
    description: 'States made of food.',
    descriptionZh: '由食物组成的州。',
    imageSrc: 'https://pbs.twimg.com/media/G7I5dbiWwAAYOox?format=jpg&name=medium',
    prompt: "Style: Photorealistic food art. Constraint: States must look like they are physically constructed from the food. Subject: Map of the US where every state is made out of its most famous food.",
    promptZh: "风格：写实食物艺术。约束：各州必须看起来像是用食物物理构建的。主体：美国地图，每个州都由其最著名的食物制成。",
    requiresImage: false
  },
  {
    id: '2.12',
    title: '3D Cartoon City View',
    titleZh: '3D 卡通城市视图',
    description: 'Miniature 3D view of buildings.',
    descriptionZh: '建筑微缩 3D 视图。',
    imageSrc: 'https://pbs.twimg.com/media/G7GOJ7WW4AAEsNE?format=jpg&name=small',
    prompt: "Style: Miniature 3D cartoon, minimal textures, realistic lighting. View: Orthographic/Side view. Labels: Height in meters and year built below each base. Subject: Miniature 3D cartoon view of the city's 3 tallest buildings arranged by height.",
    promptZh: "风格：微缩 3D 卡通，极简纹理，写实光照。视角：正交/侧视图。标签：每个底座下方标注高度（米）和建造年份。主体：按高度排列的城市 3 座最高建筑的微缩 3D 卡通视图。",
    requiresImage: false
  },
  {
    id: '2.13',
    title: '3D Isometric Home Office',
    titleZh: '3D 等轴家庭办公室',
    description: 'Isometric view of a home office.',
    descriptionZh: '家庭办公室的 3D 等轴视图。',
    imageSrc: 'https://pbs.twimg.com/media/G7MEwTWWEAA1DkO?format=jpg&name=medium',
    prompt: "Style: 3D Isometric illustration. Vibe: Rounded, polished, playful. Subject: 3D isometric colored illustration of a home office with a bichon frise and 3 monitors.",
    promptZh: "风格：3D 等距插图。氛围：圆润、抛光、俏皮。主体：带有卷毛比熊犬和 3 台显示器的家庭办公室 3D 等距彩色插图。",
    requiresImage: false
  },
  {
    id: '2.14',
    title: 'Emoji Combination',
    titleZh: 'Emoji 组合创意',
    description: 'Combine emojis.',
    descriptionZh: '组合表情符号。',
    imageSrc: 'https://pbs.twimg.com/media/G7PmjRBXgAAVKXd?format=jpg&name=medium',
    prompt: "Style: Google Emoji Design. Flat, colorful, vector-like. Subject: Combine these emojis: 🍌 + 😎, on a white background.",
    promptZh: "风格：Google Emoji 设计。扁平、多彩、矢量感。主体：组合这些表情符号：🍌 + 😎，在白色背景上。",
    requiresImage: false
  },
  {
    id: '2.15',
    title: 'Torn Paper Art Effect',
    titleZh: '撕纸艺术效果',
    description: 'Torn paper effect.',
    descriptionZh: '撕纸效果。',
    imageSrc: 'https://pbs.twimg.com/media/G7OpzpjbAAArAAS?format=jpg&name=900x900',
    prompt: "Effect: Torn-paper reveal. Interior Style: Line-art / Sketch. Preserve: Character identity, pose, outfit (outside tear). Subject: Edit image: add widened torn-paper layered effect across chest and lower abdomen.",
    promptZh: "效果：撕纸揭示。内部风格：线条艺术/素描。保留：角色身份、姿势、服装（撕口外）。主体：编辑图片：在胸部和下腹部添加加宽的撕纸分层效果。",
    requiresImage: true
  }
];
