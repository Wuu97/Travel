export type LlmMessage = { role: "system" | "user" | "assistant"; content: string };
export type LlmCompletionOptions = { maxTokens?: number };

export async function requestLlmCompletion(messages: LlmMessage[], options: LlmCompletionOptions = {}): Promise<string> {
  const rawKey = process.env.DEEPSEEK_API_KEY?.trim();
  const apiKey = rawKey?.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, "$1$2");
  if (!apiKey) throw new Error("尚未配置 DeepSeek API Key。请在 .env.local 中设置 DEEPSEEK_API_KEY 后重启预览服务。");

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      response_format: { type: "json_object" },
      messages,
      temperature: 0.7,
      max_tokens: options.maxTokens ?? 2400,
    }),
  });
  if (!response.ok) throw new Error(response.status === 401 ? "DeepSeek 认证失败（401）：请确认 .env.local 中的 Key 完整、有效，并来自 DeepSeek 开放平台。" : `DeepSeek 请求失败（${response.status}）`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content || "";
}
