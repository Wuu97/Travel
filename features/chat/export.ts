import type { ChatMessage } from "./model";

export function downloadChatTranscript(title: string, messages: ChatMessage[]) {
  const content = [
    "途遇 AI 对话记录",
    `主题：${title}`,
    `导出时间：${new Date().toLocaleString("zh-CN")}`,
    "",
    ...messages.map((message) => `${message.role === "user" ? "我" : "途遇 AI"}：\n${message.content}`),
  ].join("\n\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${title.replace(/[\\/:*?"<>|]/g, "-")}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}
