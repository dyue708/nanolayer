
export interface PromptExample {
  id: string;
  title: string;
  titleZh?: string;
  description: string;
  descriptionZh?: string;
  prompt: string;
  imageSrc: string;
}

export const PROMPT_EXAMPLES: PromptExample[] = [
  {
    id: '1.1',
    title: 'Hyper-Realistic Crowd',
    titleZh: '超写实人群',
    description: 'Complex compositions with multiple faces and specific lighting.',
    descriptionZh: '包含多张面孔和特定光照的复杂构图。',
    imageSrc: 'https://github.com/user-attachments/assets/3a056a8d-904e-4b3e-b0d2-b5122758b7f5',
    prompt: `Create a hyper-realistic, ultra-sharp, full-color large-format image featuring a massive group of celebrities from different eras, all standing together in a single wide cinematic frame. The image must look like a perfectly photographed editorial cover with impeccable lighting, lifelike skin texture, micro-details of hair, pores, reflections, and fabric fibers.

GENERAL STYLE & MOOD: Photorealistic, 8k, shallow depth of field, soft natural fill light + strong golden rim light. High dynamic range, calibrated color grading. Skin tones perfectly accurate. Crisp fabric detail with individual threads visible. Balanced composition, slightly wide-angle lens (35mm), center-weighted. All celebrities interacting naturally, smiling, posing, or conversing. Minimal background noise, but with enough world-building to feel real.

THE ENVIRONMENT: A luxurious open-air rooftop terrace at sunset overlooking a modern city skyline. Elements include: Warm golden light wrapping around silhouettes. Polished marble.`
  },
  {
    id: '1.2',
    title: '2000s Mirror Selfie',
    titleZh: '2000年代复古自拍',
    description: 'Authentic early-2000s aesthetic with flash photography.',
    descriptionZh: '真实的2000年代早期审美与闪光灯摄影风格。',
    imageSrc: 'https://github.com/user-attachments/assets/b71755dc-ff33-4872-8161-3f5066e0ccb6',
    prompt: `Create a 2000s Mirror Selfie of yourself using Gemini Nano Banana.

{
  "subject": {
    "description": "A young woman taking a mirror selfie with very long voluminous dark waves and soft wispy bangs",
    "age": "young adult",
    "expression": "confident and slightly playful",
    "hair": {
      "color": "dark",
      "style": "very long, voluminous waves with soft wispy bangs"
    },
    "clothing": {
      "top": {
        "type": "fitted cropped t-shirt",
        "color": "cream white",
        "details": "features a large cute anime-style cat face graphic with big blue eyes, whiskers, and a small pink mouth"
      }
    },
    "face": {
      "preserve_original": true,
      "makeup": "natural glam makeup with soft pink dewy blush and glossy red pouty lips"
    }
  },
  "accessories": {
    "earrings": {
      "type": "gold geometric hoop earrings"
    },
    "jewelry": {
      "waistchain": "silver waistchain"
    },
    "device": {
      "type": "smartphone",
      "details": "patterned case"
    }
  },
  "photography": {
    "camera_style": "early-2000s digital camera aesthetic",
    "lighting": "harsh super-flash with bright blown-out highlights but subject still visible",
    "angle": "mirror selfie",
    "shot_type": "tight selfie composition",
    "texture": "subtle grain, retro highlights, V6 realism, crisp details, soft shadows"
  },
  "background": {
    "setting": "nostalgic early-2000s bedroom",
    "wall_color": "pastel tones",
    "elements": [
      "chunky wooden dresser",
      "CD player",
      "posters of 2000s pop icons",
      "hanging beaded door curtain",
      "cluttered vanity with lip glosses"
    ],
    "atmosphere": "authentic 2000s nostalgic vibe",
    "lighting": "retro"
  }
}`
  },
  {
    id: '1.3',
    title: 'Victoria\'s Secret Style',
    titleZh: '维密秀场风格',
    description: 'High-glamour, backstage-style fashion photography.',
    descriptionZh: '极致迷人、后台风格的时尚摄影。',
    imageSrc: 'https://github.com/user-attachments/assets/963c0a46-cf86-4604-8782-524b94afc51d',
    prompt: `Create a glamorous photoshoot in the style of Victoria's Secret. A young woman attached in the uploaded reference image ( Keep the face of the person 100% accurate from the reference image ) stands almost sideways, slightly bent forward, during the final preparation for the show. Makeup artists apply lipstick to her (only her hands are visible in the frame). She is wearing a corset decorated with beaded embroidery and crystals with a short fluffy skirt, as well as large feather wings. The image has a "backstage" effect.

The background is a darkly lit room, probably under the podium. The main emphasis is on the girl's face and the details of her costume. Emphasize the expressiveness of the gaze and the luxurious look of the outfit. The photo is lit by a flash from the camera, which emphasizes the shine of the beads and crystals on the corset, as well as the girl's shiny skin. Victoria's Secret style: sensuality, luxury, glamour. Very detailed. Important: do not change the face.`
  },
  {
    id: '1.4',
    title: '1990s Camera Style',
    titleZh: '90年代胶片风格',
    description: 'Replicate film textures and flash photography.',
    descriptionZh: '复刻胶片质感与闪光灯摄影效果。',
    imageSrc: 'https://github.com/user-attachments/assets/eca5066b-1bf6-4a97-8b81-63e9e7435050',
    prompt: `Without changing her original face, create a portrait of a beautiful young woman with porcelain-white skin, captured with a 1990s-style camera using a direct front flash. Her messy dark brown hair is tied up, posing with a calm yet playful smile. She wears a modern oversized cream sweater. The background is a dark white wall covered with aesthetic magazine posters and stickers, evoking a cozy bedroom or personal room atmosphere under dim lighting. The 35mm lens flash creates a nostalgic glow.`
  },
  {
    id: '1.5',
    title: 'Business Headshot',
    titleZh: '商务职业头像',
    description: 'Professional silicon valley style studio headshot.',
    descriptionZh: '专业硅谷风格的影棚职业头像。',
    imageSrc: 'https://github.com/user-attachments/assets/793ad242-7867-4709-bdc6-55021f5eb78f',
    prompt: `Keep the facial features of the person in the uploaded image exactly consistent . Dress them in a professional navy blue business suit with a white shirt, similar to the reference image. Background : Place the subject against a clean, solid dark gray studio photography backdrop . The background should have a subtle gradient , slightly lighter behind the subject and darker towards the edges (vignette effect). There should be no other objects. Photography Style : Shot on a Sony A7III with an 85mm f/1.4 lens , creating a flattering portrait compression. Lighting : Use a classic three-point lighting setup . The main key light should create soft, defining shadows on the face. A subtle rim light should separate the subject's shoulders and hair from the dark background. Crucial Details : Render natural skin texture with visible pores , not an airbrushed look. Add natural catchlights to the eyes . The fabric of the suit should show a subtle wool texture.Final image should be an ultra-realistic, 8k professional headshot.`
  },
  {
    id: '1.6',
    title: 'Emotional Film Photo',
    titleZh: '情绪感胶片摄影',
    description: 'Cinematic, nostalgic "Kodak Portra" look.',
    descriptionZh: '电影感、怀旧的 "Kodak Portra" 胶卷质感。',
    imageSrc: 'https://github.com/user-attachments/assets/243d1b11-9ef0-4d4f-b308-97d67b5d3bc3',
    prompt: `Keep the facial features of the person in the uploaded image exactly consistent . Style : A cinematic, emotional portrait shot on Kodak Portra 400 film . Setting : An urban street coffee shop window at Golden Hour (sunset) . Warm, nostalgic lighting hitting the side of the face. Atmosphere : Apply a subtle film grain and soft focus to create a dreamy, storytelling vibe. Action : The subject is looking slightly away from the camera, holding a coffee cup, with a relaxed, candid expression. Details : High quality, depth of field, bokeh background of city lights.`
  },
  {
    id: '1.7',
    title: 'Pro Headshot Creator',
    titleZh: '专业头像生成器',
    description: 'Create a professional profile photo from a selfie.',
    descriptionZh: '将普通自拍转变为专业的个人资料照片。',
    imageSrc: 'https://pbs.twimg.com/media/G6x00O_XIAASY0r?format=jpg&name=900x900',
    prompt: `"A professional, high-resolution profile photo, maintaining the exact facial structure, identity, and key features of the person in the input image. The subject is framed from the chest up, with ample headroom. The person looks directly at the camera. They are styled for a professional photo studio shoot, wearing a premium smart casual blazer in a subtle charcoal gray. The background is a solid '#562226' neutral studio color. Shot from a high angle with bright and airy soft, diffused studio lighting, gently illuminating the face and creating a subtle catchlight in the eyes, conveying a sense of clarity. Captured on an 85mm f/1.8 lens with a shallow depth of field, exquisite focus on the eyes, and beautiful, soft bokeh. Observe crisp detail on the fabric texture of the blazer, individual strands of hair, and natural, realistic skin texture. The atmosphere exudes confidence, professionalism, and approachability. Clean and bright cinematic color grading with subtle warmth and balanced tones, ensuring a polished and contemporary feel."`
  },
  {
    id: '1.8',
    title: 'Anime Spotlight',
    titleZh: '聚光灯下的动漫肖像',
    description: 'Hyperrealistic anime-style portrait with dramatic lighting.',
    descriptionZh: '具有戏剧性光影的超写实动漫风格肖像。',
    imageSrc: 'https://pbs.twimg.com/media/G7Ah9SIbIAAGlyu?format=jpg&name=900x900',
    prompt: `Generate a hyperrealistic realistic-anime portrait of a female character standing in a completely black background.
Lighting: use a **narrow beam spotlight** focused only on the center of the face. 
The edges of the light must be sharp and dramatic. 
All areas outside the spotlight should fall quickly into deep darkness 
(high falloff shadow), almost blending into the black background. 
Not soft lighting.
Hair: long dark hair with some strands falling over the face. The lower parts of the hair should fade into the shadows.
Pose: one hand raised gently to the lips in a shy, hesitant gesture. 
Eyes looking directly at the camera with a mysterious mood.
Clothing: black long-sleeve knit sweater; 
the sweater and body should mostly disappear into the darkness with minimal detail.
Overall tone: dark, moody, dramatic, mysterious. 
High-contrast only in the lit portion of the face. 
Everything outside the spotlight should be nearly invisible.`
  },
  {
    id: '1.9',
    title: 'Bathroom Mirror Selfie',
    titleZh: '浴室镜面自拍',
    description: 'Candid mirror selfie with specific styling.',
    descriptionZh: '具有特定造型和构图的抓拍风格镜面自拍。',
    imageSrc: 'https://pbs.twimg.com/media/G7PebGOW8AALh2P?format=jpg&name=large',
    prompt: `{
  "subject": {
    "description": "Young woman taking bathroom mirror selfie, innocent doe eyes but the outfit tells another story",
    "mirror_rules": "facing mirror, hips slightly angled, close to mirror filling frame",
    "age": "early 20s",
    "expression": {
      "eyes": "big innocent doe eyes looking up through lashes, 'who me?' energy",
      "mouth": "soft pout, lips slightly parted, maybe tiny tongue touching corner",
      "brows": "soft, slightly raised, faux innocent",
      "overall": "angel face but devil body, the contrast is the whole point"
    },
    "hair": {
      "color": "platinum blonde",
      "style": "messy bun or claw clip, loose strands framing face, effortless"
    },
    "body": {
      "waist": "tiny",
      "ass": "round, full, fabric of shorts riding up and clinging between cheeks, every curve visible through thin athletic material",
      "thighs": "thick, soft, shorts barely containing"
    },
    "clothing": {
      "top": {
        "type": "ULTRA mini crop tee",
        "color": "yellow",
        "graphic": "single BANANA logo/graphic",
        "fit": "barely containing chest, fabric stretched tight, ends just below, shows full stomach"
      },
      "bottom": {
        "type": "tight tennis skort or athletic booty shorts",
        "color": "white",
        "material": "thin stretchy athletic fabric",
        "fit": "vacuum tight, riding up, clinging between cheeks, fabric creases visible, leaving nothing to imagination"
      }
    },
    "face": {
      "features": "pretty - big eyes, small nose, full lips",
      "makeup": "minimal, natural, lip gloss, no-makeup makeup"
    }
  },
  "accessories": {
    "headwear": {
      "type": "Goorin Bros cap",
      "details": "black with animal patch, worn backwards or tilted"
    },
    "headphones": {
      "type": "over-ear white headphones",
      "position": "around neck"
    },
    "device": {
      "type": "iPhone",
      "details": "visible in mirror, held at chest level"
    }
  },
  "photography": {
    "camera_style": "casual iPhone mirror selfie, NOT professional",
    "quality": "iPhone camera - good but not studio, realistic social media quality",
    "angle": "eye-level, straight on mirror",
    "shot_type": "3/4 body, close to mirror",
    "aspect_ratio": "9:16 vertical",
    "texture": "natural, slightly grainy iPhone look, not over-processed"
  },
  "background": {
    "setting": "regular apartment bathroom",
    "style": "normal NYC apartment bathroom, not luxury",
    "elements": [
      "white subway tile walls",
      "basic bathroom mirror with good lighting above",
      "simple white sink vanity",
      "toiletries visible - skincare bottles, toothbrush holder",
      "towel hanging on hook",
      "maybe shower curtain edge visible",
      "small plant on counter"
    ],
    "atmosphere": "real bathroom, lived-in, normal home",
    "lighting": "good vanity lighting above mirror - bright, even, flattering but not studio"
  },
  "vibe": {
    "energy": "innocent face + sinful body = the whole game",
    "mood": "just got ready for tennis but making content first, 'what?' expression while wearing basically nothing",
    "contrast": "doe eyes + ass eating the shorts = lethal",
    "caption_energy": "'tennis anyone? 🍌' or 'running late oops'"
  }
}`
  },
  {
    id: '1.10',
    title: 'Chalkboard Anime Art',
    titleZh: '黑板动漫艺术',
    description: 'Photorealistic documentation of chalkboard art.',
    descriptionZh: '写实风格的黑板画记录。',
    imageSrc: 'https://pbs.twimg.com/media/G65Uh3ebkAEqbv5?format=jpg&name=medium',
    prompt: `{
  "intent": "Photorealistic documentation of a specific chalkboard art piece featuring a single anime character, capturing the ephemeral nature of the medium within a classroom context.",
  "frame": {
    "aspect_ratio": "4:3",
    "composition": "A centered medium shot focusing on the chalkboard mural. The composition includes the teacher's desk in the immediate foreground to provide scale, with the artwork of the single character dominating the background space.",
    "style_mode": "documentary_realism, texture-focused, ambient naturalism"
  },
  "subject": {
    "primary_subject": "A large-scale, intricate chalk drawing of Boa Hancock from 'One Piece' on a standard green classroom blackboard.",
    "visual_details": "The illustration depicts Boa Hancock in a commanding pose, positioned centrally on the board. She is drawn with her signature long, straight black hair with a hime cut, rendered using dense application of black chalk with white accents for sheen. Her expression is haughty and imperious, with detailed dark blue eyes. She is depicted forming a heart shape with her hands, referencing her 'Mero Mero Mellow' technique. She wears a revealing red blouse with purple geometric patterns and gold snake-shaped earrings, drawn with vibrant colored chalks.",
    "medium_texture": "The image preserves the dusty, matte quality of the chalk. Visible hatching and cross-hatching strokes create shading on her clothing and hair. Smudged areas on the green slate indicate where colors have been blended by hand.",
    "surrounding_elements": "To the right of the character, vertical Japanese text reading '海賊女帝' (Pirate Empress) is written in crisp white chalk."
  },
  "environment": {
    "location": "A standard Japanese school classroom.",
    "foreground_elements": "A wooden teacher's desk occupies the lower foreground. Scattered across the surface are a yellow box of colored chalks, loose sticks of red, white, and blue pastel chalk, and a dust-covered black felt eraser.",
    "background_elements": "The green chalkboard spans the width of the frame, bordered by a metallic chalk tray containing accumulated chalk dust. The wall above is a plain, off-white plaster, featuring a small mounted speaker box.",
    "atmosphere": "Quiet and academic, with a sense of stillness suggesting the room is currently unoccupied."
  },
  "lighting": {
    "type": "Diffuse ambient classroom lighting.",
    "quality": "Soft, nondirectional illumination provided by overhead fluorescent fixtures mixed with daylight from windows on the left. The light is even, preventing glare on the chalkboard surface while highlighting the texture of the chalk.",
    "color_temperature": "Neutral white, approximately 5000K, ensuring accurate color rendition of the red and purple chalks against the dark green board.",
    "direction": "Overhead and slightly frontal."
  },
  "camera": {
    "sensor_format": "35mm full-frame digital sensor.",
    "lens": "35mm prime lens.",
    "aperture": "f/5.6",
    "depth_of_field": "Moderate depth of field, keeping the chalkboard drawing in sharp focus while allowing the foreground desk elements to soften slightly.",
    "shutter_speed": "1/60s",
    "iso": "400",
    "camera_position": "Eye-level standing position, set back enough to frame the entire drawing and the desk."
  },
  "negative": {
    "content": "Multiple characters, Midoriya, Shigaraki, male characters, digital art overlay, vector graphics, paper texture, oil painting, messy composition, extreme low angle, fisheye lens.",
    "style": "No hyper-saturation, no soft focus filters, no heavy vignetting."
  }
}`
  },
  {
    id: '1.11',
    title: 'Portrait with Puppy in Snow',
    titleZh: '雪地小狗人像',
    description: 'Create a winter portrait with a puppy',
    descriptionZh: '创作一张带有小狗的冬季人像。',
    imageSrc: 'https://pbs.twimg.com/media/G6qMd2abwAA-hAi?format=jpg&name=900x900',
    prompt: `{
  "image_description": {
    "subject": {
      "face": {
        "preserve_original": true,
        "reference_match": true,
        "description": "The girl's facial features, expression, and identity must remain exactly the same as the reference image."
      },
      "girl": {
        "age": "young",
        "hair": "long, wavy brown hair",
        "expression": "puckering her lips toward the camera",
        "clothing": "black hooded sweatshirt"
      },
      "puppy": {
        "type": "small white puppy",
        "eyes": "light blue",
        "expression": "calm, looking forward"
      }
    },
    "environment": {
      "setting": "outdoors in a winter scene",
      "elements": [
        "snow covering the ground",
        "bare trees in the background",
        "blurred silver car behind the girl"
      ],
      "sky": "clear light blue sky"
    },
    "mood": "cute, natural, winter outdoor moment",
    "camera_style": "soft depth of field, natural daylight, subtle winter tones"
  }
}`
  },
  {
    id: '1.12',
    title: 'Fisheye Movie Character Selfie',
    titleZh: '鱼眼电影角色自拍',
    description: 'A 360-degree selfie with movie characters',
    descriptionZh: '与电影角色一起的360度全景自拍。',
    imageSrc: 'https://pbs.twimg.com/media/G7Q6stnXIAAe7Vz?format=jpg&name=small',
    prompt: `A film-like fisheye wide-angle 360-degree selfie without any camera or phone visible in the subject's hands. A real and exaggerated selfie of [person from uploaded image] with [CHARACTERS]. They are making faces at the camera.

(more detailed version)
A hyper-realistic fisheye wide-angle selfie, captured with a vintage 35mm fisheye lens creating heavy barrel distortion. without any camera or phone visible in the subject's hands.
Subject & Action: A close-up, distorted group photo featuring [Person From Uploaded Image] taking selfie with [CHARACTERS]. Everyone is making wild, exaggerated faces, squinting slightly from the flash.
Lighting & Texture: Harsh, direct on-camera flash lighting that creates hard shadows behind the subjects. Authentic film grain, slight motion blur on the edges, and chromatic aberration. It looks like a candid, amateur snapshot as if captured during a chaotic behind-the-scenes moment, not a studio photo.`
  },
  {
    id: '1.13',
    title: 'Character Consistency Selfie',
    titleZh: '角色一致性自拍',
    description: 'Take a selfie with a movie character while preserving your features',
    descriptionZh: '在保持个人面部特征的同时与电影角色自拍。',
    imageSrc: 'https://pbs.twimg.com/media/G7HwgjGaYAAgJ67?format=jpg&name=small',
    prompt: `"I'm taking a selfie with [movie character] on the set of [movie name].

Keep the person exactly as shown in the reference image with 100% identical facial features, bone structure, skin tone, facial expression, pose, and appearance. 1:1 aspect ratio, 4K detail."`
  },
  {
    id: '1.14',
    title: 'Museum Art Exhibition Selfie',
    titleZh: '博物馆艺术展自拍',
    description: 'A commercial-grade photo with a classical oil painting',
    descriptionZh: '在古典油画前拍摄的商业级自拍照。',
    imageSrc: 'https://pbs.twimg.com/media/G7N2KUIbMAAspf6?format=jpg&name=900x900',
    prompt: `A commercial grade photograph of [uploaed reference image] posing inside a high-end museum exhibition space.
[the character Source: Based strictly on the uploaded reference image.
Behind them hangs a large, ornate framed classical oil painting.

The painting depicts the same person but rendered in a rich,
traditional oil painting style with thick, visible impasto brushstrokes, deep textures, and rich color palettes on canvas.
Gallery spotlights hit the textured paint surface.
Masterpiece, ultra-detailed, cinematic lighting, strong contrast, dramatic shadows, 8K UHD, highly detailed textures
, professional photography.`
  },
  {
    id: '1.15',
    title: 'Compact Camera Screen Display',
    titleZh: '相机屏幕实拍效果',
    description: 'A photo displayed on a compact digital camera screen',
    descriptionZh: '模拟复古数码相机屏幕上显示的照片效果。',
    imageSrc: 'https://pbs.twimg.com/media/G7NVohbbgAcUFBe?format=jpg&name=900x900',
    prompt: `Use facial feature of attached photo. A close-up shot of a young woman displayed on the screen of a compact Canon digital camera. The camera body surrounds the image with its buttons, dials, and textured surface visible, including the FUNC/SET wheel, DISP button, and the "IMAGE STABILIZER" label along the side. The photo on the screen shows the woman indoors at night, illuminated by a bright built-in flash that creates sharp highlights on her face and hair. She has long dark hair falling across part of her face in loose strands, with a soft, slightly open-lip expression. The flash accentuates her features against a dim, cluttered kitchen background with appliances, shelves, and metallic surfaces softly blurred. The mood is candid, raw, nostalgic, and reminiscent of early 2000s digital camera snapshots. Colors are slightly muted with cool undertones, strong flash contrast, and natural grain from the display. No text, no logos inside the photo preview itself.

Scale ratio: 4:5 vertical

Camera: compact digital camera simulation
Lens: equivalent to 28–35mm
Aperture: f/2.8
ISO: 400
Shutter speed: 1/60 with flash
White balance: auto flash
Lighting: harsh direct flash on subject, ambient low light in the background
Color grading: nostalgic digital-camera tones, high contrast flash, subtle display grain, authentic screen glow.`
  },
  {
    id: '1.16',
    title: 'Magazine Cover Portrait',
    titleZh: '杂志封面人像',
    description: 'Create a glossy magazine cover',
    descriptionZh: '制作一张光面杂志封面图。',
    imageSrc: 'https://pbs.twimg.com/media/G7QmCFcXoAAwaet?format=jpg&name=large',
    prompt: `A photo of a glossy magazine cover, the cover has the large bold words "Nano Banana Pro". The text is in a serif font, black on white, and fills the view. No other text.

In front of the text there is a dynamic portrait of a person in green and banana yellow colored high-end fashion.

Put the issue number and today's date in the corner along with a barcode and a price. The magazine is on a white shelf against a wall.`
  },
  {
    id: '1.17',
    title: 'Luxury Product Photography',
    titleZh: '奢华产品摄影',
    description: 'Create a floating luxury product shot',
    descriptionZh: '创作一张悬浮的奢华产品摄影图。',
    imageSrc: 'https://raw.githubusercontent.com/ZeroLu/awesome-nanobanana-pro/refs/heads/main/assets/luxury-product-shot.jpg',
    prompt: `Product:
[BRAND] [PRODUCT NAME] - [bottle shape], [label description], [liquid color]

Scene:
Luxury product shot floating on dark water with [flower type] in [colors] arranged around it.
[Lighting style - e.g., "golden hour glow" /
"bright fresh light"] creates reflections and ripples across the water.

Mood & Style:
[Adjectives - e.g., "ethereal and luxurious" /
"fresh and clean"], high-end commercial photography, [camera angle], shallow depth of field with soft bokeh background`
  },
  {
    id: '2.1',
    title: 'Star Wars "Where\'s Waldo"',
    titleZh: '星球大战版“威利在哪里”',
    description: 'A complex prompt testing the model\'s ability to handle dense crowds and specific character recognition.',
    descriptionZh: '测试模型处理密集人群和特定角色识别能力的复杂提示词。',
    imageSrc: 'https://github.com/user-attachments/assets/439317c2-4be8-4b28-803f-36427ecca31e',
    prompt: `A where is waldo image showing all Star Wars characters on Tatooine

First one to pull this off. First take. Even Waldo is there.`
  },
  {
    id: '2.2',
    title: 'Aging Through the Years',
    titleZh: '岁月变迁（年龄变化）',
    description: 'Demonstrates temporal consistency and aging effects on a single subject.',
    descriptionZh: '展示单个主体的年龄变化和时间一致性效果。',
    imageSrc: 'https://github.com/user-attachments/assets/74fced67-0715-46d3-b788-d9ed9e98873b',
    prompt: `"Generate the holiday photo of this person through the ages up to 80 years old"`
  },
  {
    id: '2.3',
    title: 'Recursive Visuals',
    titleZh: '递归视觉效果',
    description: 'Demonstrates the model\'s ability to handle infinite loop logic (Droste effect).',
    descriptionZh: '展示模型处理无限循环逻辑（德罗斯特效应）的能力。',
    imageSrc: 'https://github.com/user-attachments/assets/f7ef5a84-e2bf-4d4e-a93e-38a23a21b9ef',
    prompt: `recursive image of an orange cat sitting in an office chair holding up an iPad. On the iPad is the same cat in the same scene holding up the same iPad. Repeated on each iPad.`
  },
  {
    id: '2.4',
    title: 'Coordinate Visualization',
    titleZh: '经纬度可视化',
    description: 'Generates a specific location and time based purely on latitude/longitude coordinates.',
    descriptionZh: '仅基于经纬度坐标生成特定的地点和时间。',
    imageSrc: 'https://github.com/user-attachments/assets/8629b88a-b872-43e2-a19e-855542702ac2',
    prompt: `35.6586° N, 139.7454° E at 19:00`
  },
  {
    id: '2.5',
    title: 'Conceptual Visualization',
    titleZh: '概念可视化',
    description: 'Interpretative rendering of how a specific group (engineers) visualizes a landmark.',
    descriptionZh: '诠释性渲染：例如工程师眼中的旧金山大桥。',
    imageSrc: 'https://github.com/user-attachments/assets/761380fe-0850-49e2-8589-797f10b7cb8d',
    prompt: `How engineers see the San Francisco Bridge`
  },
  {
    id: '2.6',
    title: 'Literal Interpretation',
    titleZh: '文字直译可视化',
    description: 'Interprets a filename as a visual subject.',
    descriptionZh: '将文件名直接解释为视觉主体（例如 rare.jpg）。',
    imageSrc: 'https://replicate.delivery/xezq/piAS0s9DshbqMFXJvIfw9feWaEaNsejlRifhVgMSflvZJzzaF/tmp3u2ym4f_.jpeg',
    prompt: `rare.jpg`
  },
  {
    id: '2.7',
    title: 'Multi-Subject Compositing',
    titleZh: '多主体合成',
    description: 'Combines multiple input portraits into a single cohesive group photo with a specific expression.',
    descriptionZh: '将多张输入肖像合成一张具有特定表情的连贯集体照。',
    imageSrc: 'https://github.com/user-attachments/assets/54e2a2eb-1ab4-4f2b-86a2-7a59856e615f',
    prompt: `an office team photo, everyone making a silly face`
  },
  {
    id: '2.8',
    title: 'Whiteboard Marker Art',
    titleZh: '白板马克笔艺术',
    description: 'Simulating specific drawing media (faded marker) on glass textures.',
    descriptionZh: '模拟特定绘画介质（褪色马克笔）在玻璃纹理上的效果。',
    imageSrc: 'https://github.com/user-attachments/assets/b399c4d9-151b-4e15-9a40-f092f7a892b9',
    prompt: `Create a photo of vagabonds musashi praying drawn on a glass whiteboard in a slightly faded green marker`
  },
  {
    id: '2.9',
    title: 'Split View 3D Render',
    titleZh: '分屏 3D 渲染',
    description: 'Create a 3D render with realistic left half and wireframe right half',
    descriptionZh: '创建左半部分写实、右半部分线框图的 3D 渲染图。',
    imageSrc: 'https://pbs.twimg.com/media/G7LmGCQWYAAfp47?format=jpg&name=small',
    prompt: `Create a high-quality, realistic 3D render of exactly one instance of the object: [Orange iPhone 17 Pro].
The object must float freely in mid-air and be gently tilted and rotated in 3D space (not front-facing).
Use a soft, minimalist dark background in a clean 1080×1080 composition.
Left Half — Full Realism
The left half of the object should appear exactly as it looks in real life
— accurate materials, colors, textures, reflections, and proportions.
This half must be completely opaque with no transparency and no wireframe overlay.
No soft transition, no fading, no blending.
Right Half — Hard Cut Wireframe Interior
The right half must switch cleanly to a wireframe interior diagram.
The boundary between the two halves must be a perfectly vertical, perfectly sharp, crisp cut line, stretching straight from the top edge to the bottom edge of the object.
No diagonal edges, no curved slicing, no gradient.
The wireframe must use only two line colors:
Primary: white (≈80% of all lines)
Secondary: a color sampled from the dominant color of the realistic half (<20% of lines)
The wireframe lines must be thin, precise, aligned, and engineering-style.
Every wireframe component must perfectly match the geometry of the object.
Strict Single-Object Rule
Render only ONE object in the entire frame.  Render only one physical object.
Do NOT show a second object from any angle. Do NOT show a second object as a reflection, shadow, silhouette, outline, ghost image, or transparency. Do NOT show a second object for comparison or display purposes. Do NOT show both the front and the back separately.
Do NOT show an extra device behind, beside, underneath, or partially hidden.
Only one single object is allowed in the entire frame.
No duplicate objects, no mirrored back-and-front pairings, no reflections showing a second object.
The object must appear alone, floating.
Pose & Lighting:
Apply a natural, subtle tilt + rotation in 3D to make it look like a floating product visualization.
Use soft, neutral global illumination and no shadows under the object.
No extra props, no text, no labels unless explicitly requested.`
  },
  {
    id: '2.10',
    title: 'USA 3D Diorama',
    titleZh: '美国地标 3D 透视模型',
    description: 'Create an isometric 3D diorama of US landmarks',
    descriptionZh: '创建美国地标的等距 3D 透视模型。',
    imageSrc: 'https://pbs.twimg.com/media/G7LGpq0XAAAxcIP?format=jpg&name=medium',
    prompt: `Create a high-detail 3D isometric diorama of the entire United States, where each state is represented as its own miniature platform. Inside each state, place a stylized, small-scale 3D model of that state's most iconic landmark. Use the same visual style as a cute, polished 3D city diorama: soft pastel colors, clean materials, smooth rounded forms, gentle shadows, and subtle reflections. Each landmark should look like a miniature model, charming, simplified, but clearly recognizable. Arrange the states in accurate geographical layout, with consistent lighting and perspective. Include state labels and landmark labels in a clean, modern font, floating above or near each model.`
  },
  {
    id: '2.11',
    title: 'US Food Map',
    titleZh: '美国美食地图',
    description: 'Create a map of US states made of famous foods',
    descriptionZh: '创建一张由著名食物组成的美国州地图。',
    imageSrc: 'https://pbs.twimg.com/media/G7I5dbiWwAAYOox?format=jpg&name=medium',
    prompt: `create a map of the US where every state is made out of its most famous food (the states should actually look like they are made of the food, not a picture of the food). Check carefully to make sure each state is right.`
  },
  {
    id: '2.12',
    title: '3D Cartoon City View',
    titleZh: '3D 卡通城市视图',
    description: 'Create a miniature 3D view of city\'s tallest buildings',
    descriptionZh: '创建城市最高建筑的微缩 3D 视图。',
    imageSrc: 'https://pbs.twimg.com/media/G7GOJ7WW4AAEsNE?format=jpg&name=small',
    prompt: `Present a clear, side miniature 3D cartoon view of [YOUR CITY] tallest buildings. Use minimal textures with realistic materials and soft, lifelike lighting and shadows. Use a clean, minimalistic composition showing exactly the three tallest buildings in Sopot, arranged from LEFT to RIGHT in STRICT descending height order. The tallest must appear visibly tallest, the second must be clearly shorter than the first, and the third must be clearly shorter than the second.
All buildings must follow accurate relative proportions: if a building is taller in real life, it MUST be taller in the image by the same approximate ratio. No building may be visually stretched or compressed.
Each building should stand separately on a thin, simple ceramic base. Below each base, centered text should display:
Height in meters — semibold sans-serif, medium size
Year built — lighter-weight sans-serif, smaller size, directly beneath the height text
Provide consistent padding, spacing, leading, and kerning. Write "YOUR CITY NAME" centered above the buildings, using a medium-sized sans-serif font.
 No building top should overlap or touch the text above.Use accurate architectural proportions based on real-world references.Maintain consistent camera angle and identical scale for each building model.
No forced perspective. Use straight-on orthographic-style rendering. Do not exaggerate or stylize size differences beyond proportional accuracy.

Use a square 1080×1080 composition.Use a clean, neutral background. Ensure no extra objects are present.`
  },
  {
    id: '2.13',
    title: '3D Isometric Home Office',
    titleZh: '3D 等轴家庭办公室',
    description: 'Create a 3D isometric view of a home office',
    descriptionZh: '创建家庭办公室的 3D 等轴视图。',
    imageSrc: 'https://pbs.twimg.com/media/G7MEwTWWEAA1DkO?format=jpg&name=medium',
    prompt: `Based on you know about me, generate a 3D isometric colored illustration of me working from home, filled with various interior details. The visual style should be rounded, polished, and playful. --ar 1:1

[Additional details: a bichon frise and 3 monitors]`
  },
  {
    id: '2.14',
    title: 'Emoji Combination',
    titleZh: 'Emoji 组合创意',
    description: 'Combine emojis in a Google-style design - Banana with Sunglasses',
    descriptionZh: '以 Google Emoji 风格组合表情符号 - 戴墨镜的香蕉。',
    imageSrc: 'https://pbs.twimg.com/media/G7PmjRBXgAAVKXd?format=jpg&name=medium',
    prompt: `combine these emojis: 🍌 + 😎, on a white background as a google emoji design`
  },
  {
    id: '2.15',
    title: 'Torn Paper Art Effect',
    titleZh: '撕纸艺术效果',
    description: 'Add torn paper effect to specific areas of an image',
    descriptionZh: '在图片的特定区域添加撕纸效果。',
    imageSrc: 'https://pbs.twimg.com/media/G7OpzpjbAAArAAS?format=jpg&name=900x900',
    prompt: `task: "edit-image: add widened torn-paper layered effect"

base_image:
  use_reference_image: true
  preserve_everything:
    - character identity
    - facial features and expression
    - hairstyle and anatomy
    - outfit design and colors
    - background, lighting, composition
    - overall art style

rules:
  - Only modify the torn-paper interior areas.
  - Do not change pose, anatomy, proportions, clothing details, shading, or scene elements.

effects:
  - effect: "torn-paper-reveal"
    placement: "across chest height"
    description:
      - Add a wide, natural horizontal tear across the chest area.
      - The torn interior uses the style defined in \`interior_style\`.

  - effect: "torn-paper-reveal"
    placement: "lower abdomen height"
    description:
      - Add a wide horizontal tear across the lower abdomen.
      - The torn interior uses the style defined in \`interior_style\`.

interior_style:
  mode: "line-art"

  style_settings:
    line-art:
      palette: "monochrome"
      line_quality: "clean, crisp"
      paper: "notebook paper with subtle ruled lines"

    sumi-e:
      palette: "black ink tones"
      brush_texture: "soft bleeding edges"
      paper: "plain textured paper"

    figure-render:
      material: "PVC-like"
      shading: "semi-realistic highlights"
      paper: "plain smooth surface"

    colored-pencil:
      stroke_texture: "visible pencil grain"
      palette: "soft layered hues"
      paper: "rough sketchbook paper"

    watercolor:
      palette: "soft transparent pigments"
      blending: "smooth bleeding"
      edges: "soft contours"
      paper: "watercolor paper texture"

    pencil-drawing:
      graphite_texture: "visible pencil grain"
      shading: "smooth gradients"
      line_quality: "mixed sharp and soft"
      tone: "gray-scale"
      paper: "notebook paper with faint ruled lines"`
  }
];
