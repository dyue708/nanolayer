/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** 与飞书开放平台「重定向 URL」完全一致，缺省为当前 origin + `/` */
  readonly VITE_FEISHU_REDIRECT_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


