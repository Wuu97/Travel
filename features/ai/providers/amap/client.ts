import type { AmapApiResponse } from "./types";

const AMAP_BASE_URL = "https://restapi.amap.com";
const AMAP_TIMEOUT_MS = 10_000;

export class AmapClient {
  constructor(private readonly apiKey: string, private readonly fetcher: typeof fetch = fetch) {
    if (!apiKey.trim()) throw new Error("未配置高德地图 Web Service Key。");
  }

  async request<T extends AmapApiResponse>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
    const searchParams = new URLSearchParams({ key: this.apiKey });
    for (const [key, value] of Object.entries(params)) if (value !== undefined) searchParams.set(key, String(value));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AMAP_TIMEOUT_MS);
    try {
      const response = await this.fetcher(`${AMAP_BASE_URL}${path}?${searchParams}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`高德地图请求失败（${response.status}）。`);
      const data = await response.json() as T;
      if (data.status !== "1") {
        const info = typeof data.info === "string" && data.info ? data.info : "未知错误";
        const infocode = typeof data.infocode === "string" && data.infocode ? data.infocode : "未知错误码";
        throw new Error(`高德地图请求失败：${info}（${infocode}）。`);
      }
      return data;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw new Error("高德地图请求超时。");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
