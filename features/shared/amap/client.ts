export const AMAP_API_BASE_URL = "https://restapi.amap.com";
export const AMAP_DEFAULT_TIMEOUT_MS = 10_000;

type AmapResponse = { status?: unknown; info?: unknown; infocode?: unknown };
type AmapParams = Record<string, string | number | undefined>;
type AmapRequestOptions = { fetchImpl?: typeof fetch; signal?: AbortSignal; timeoutMs?: number };

export class AmapHttpError extends Error {
  constructor(status: number) { super(`高德地图请求失败（${status}）。`); }
}

export class AmapStatusError extends Error {
  constructor(info: unknown, infocode: unknown) {
    super(`高德地图请求失败：${typeof info === "string" && info ? info : "未知错误"}（${typeof infocode === "string" && infocode ? infocode : "未知错误码"}）。`);
  }
}

export class AmapTimeoutError extends Error {
  constructor() { super("高德地图请求超时。"); }
}

export class AmapClient {
  constructor(private readonly apiKey: string, private readonly fetcher: typeof fetch = fetch) {
    if (!apiKey.trim()) throw new Error("未配置高德地图 Web Service Key。");
  }

  async request<T extends AmapResponse>(path: string, params: AmapParams, options: AmapRequestOptions = {}): Promise<T> {
    const url = new URL(path, AMAP_API_BASE_URL);
    url.searchParams.set("key", this.apiKey);
    for (const [key, value] of Object.entries(params)) if (value !== undefined) url.searchParams.set(key, String(value));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? AMAP_DEFAULT_TIMEOUT_MS);
    const abortFromSignal = () => controller.abort();
    options.signal?.addEventListener("abort", abortFromSignal, { once: true });
    if (options.signal?.aborted) controller.abort();
    try {
      const response = await (options.fetchImpl ?? this.fetcher)(url, { signal: controller.signal });
      if (!response.ok) throw new AmapHttpError(response.status);
      const data = await response.json() as T;
      if (data.status !== "1") throw new AmapStatusError(data.info, data.infocode);
      return data;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw new AmapTimeoutError();
      throw error;
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abortFromSignal);
    }
  }
}
