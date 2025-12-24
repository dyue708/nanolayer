declare module 'ali-oss' {
  export interface PutObjectOptions {
    contentType?: string;
  }

  export interface PutObjectResult {
    url: string;
    name: string;
  }

  export interface ClientConfig {
    accessKeyId: string;
    accessKeySecret: string;
    region: string;
    bucket: string;
  }

  export default class OSS {
    constructor(config: ClientConfig);
    put(name: string, file: Buffer | string, options?: PutObjectOptions): Promise<PutObjectResult>;
  }
}

