# NanoLayer Studio

NanoLayer Studio is a professional-grade, web-based image editor powered by Google's Gemini generative AI models. It combines traditional layer-based editing workflows with cutting-edge AI capabilities for generation, modification, and analysis.

## ✨ Key Features

### 🎨 Layer-Based Editing
- **Full Layer System**: Manage multiple layers with visibility toggles, opacity controls, and z-index ordering.
- **PSD Support**: Import and Export Adobe Photoshop (.psd) files, preserving layer structure.
- **Standard Image Support**: Import/Export PNG, JPG, and WebP formats.

### 🤖 Generative AI Power
- **Dual Model Support**:
  - **Gemini 2.5 Flash Image** (Nano Banana): Fast, efficient model for quick edits.
  - **Gemini 3 Pro Image Preview**: High-fidelity model for complex generation and reasoning.
- **Generative Edit**: Use text prompts to modify existing images (e.g., "Add sunglasses", "Change background to space").
- **Region Selection (Masking)**: Select specific areas of the canvas to apply AI edits locally without affecting the rest of the image.
- **Style Reference**: Select a specific layer to serve as a "Style Reference" for your generations (Multimodal editing).
- **System Instructions**: Define global style guides (e.g., "Cyberpunk style", "Oil painting") to ensure consistent outputs.

### 👁️ Image Analysis
- **Deep Understanding**: Utilize **Gemini 3 Pro** to analyze layers and get detailed descriptions, style breakdowns, or answers to questions about the image content.

### ⚙️ Application Features
- **Internationalization**: Full support for English and Chinese (中文) interfaces.
- **Custom API Key**: Use the built-in system key or provide your own Google GenAI API Key via Settings (stored locally).
- **Responsive Workspace**: Infinite canvas feel with zoom and pan adaptation (auto-fit).

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **AI SDK**: Google GenAI SDK (`@google/genai`)
- **Image Processing**: HTML5 Canvas API, `ag-psd` for Photoshop file handling

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/dyue708/nanolayer
   cd nanolayer
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

## 🔑 Configuration

To use the AI features, you need a valid Google GenAI API Key.
- You can create a `.env` file in the root directory:
  ```
  API_KEY=your_api_key_here
  ```
- Or enter it directly in the application **Settings** menu (gear icon).

---

# NanoLayer Studio (中文文档)

NanoLayer Studio 是一款专业级的网页图像编辑器，由 Google Gemini 生成式 AI 模型驱动。它结合了传统的图层编辑工作流与尖端的 AI 生成、修改和分析能力。

## ✨ 核心功能

### 🎨 图层化编辑
- **全功能图层系统**：支持多图层管理，具备可见性切换、不透明度控制和 Z 轴排序功能。
- **PSD 支持**：支持导入和导出 Adobe Photoshop (.psd) 文件，并保留图层结构。
- **标准图片支持**：支持导入/导出 PNG, JPG, 和 WebP 格式。

### 🤖 生成式 AI 能力
- **双模型支持**：
  - **Gemini 2.5 Flash Image** (Nano Banana)：快速、高效，适合快速编辑。
  - **Gemini 3 Pro Image Preview**：高保真模型，适合复杂的生成和逻辑推理任务。
- **生成式编辑**：使用文本提示词修改现有图片（例如：“添加墨镜”，“把背景换成太空”）。
- **区域选择 (蒙版)**：选择画布的特定区域，仅对该区域应用 AI 编辑，不影响图片的其他部分。
- **风格参考**：选择一个特定图层作为“风格参考”，实现多模态编辑与风格迁移。
- **系统提示词**：定义全局风格指南（例如：“赛博朋克风格”，“油画风格”）以确保输出风格的一致性。

### 👁️ 图像分析
- **深度理解**：利用 **Gemini 3 Pro** 分析图层，获取详细的描述、风格拆解，或回答关于图片内容的具体问题。

### ⚙️ 应用特性
- **国际化**：完全支持英文和中文（Chinese）界面切换。
- **自定义 API Key**：支持使用内置系统 Key，或在“设置”菜单中输入您自己的 Google GenAI API Key（仅存储在本地）。
- **响应式工作区**：具备无限画布体验，支持自动适应缩放和平移。

## 🛠️ 技术栈

- **前端**: React 18, TypeScript, Vite
- **样式**: Tailwind CSS
- **AI SDK**: Google GenAI SDK (`@google/genai`)
- **图像处理**: HTML5 Canvas API, `ag-psd` (用于处理 Photoshop 文件)

## 🚀 快速开始

1. **克隆仓库**
   ```bash
   git clone https://github.com/dyue708/nanolayer
   cd nanolayer
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **运行开发服务器**
   ```bash
   npm run dev
   ```

4. **构建生产版本**
   ```bash
   npm run build
   ```

## 🔑 配置

要使用 AI 功能，您需要一个有效的 Google GenAI API Key。
- 您可以在根目录创建一个 `.env` 文件：
  ```
  API_KEY=your_api_key_here
  ```
- 或者直接在应用程序的 **设置** 菜单（齿轮图标）中输入。

---
*Powered by Google Gemini API*