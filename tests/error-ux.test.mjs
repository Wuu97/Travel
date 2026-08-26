import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("云端旅行列表失败时保留本地列表，并提供独立且防重的重试", async () => {
  const source = await readFile(new URL("features/trip/components/TripLibrary.tsx", root), "utf8");
  assert.match(source, /applyItems\(storedItems, persisted\);[\s\S]*?void listAccessibleTrips\(accessToken\)/);
  assert.match(source, /云端旅行暂时无法加载，当前显示本地数据。/);
  assert.match(source, /if \(!accessToken \|\| cloudListRetrying\) return;/);
  assert.match(source, /disabled=\{cloudListRetrying\}/);
  assert.match(source, /setCloudListError\(null\);/);
});

test("同步失败与版本冲突使用独立恢复路径", async () => {
  const [persistence, app] = await Promise.all([
    readFile(new URL("features/trip/hooks/useTripPersistence.ts", root), "utf8"),
    readFile(new URL("features/travel/components/TravelAppContent.tsx", root), "utf8"),
  ]);
  assert.match(persistence, /云端同步失败，本地修改已保留。/);
  assert.match(persistence, /const retrySync = async \(\) => \{/);
  assert.match(persistence, /if \(!failed \|\| !accessToken \|\| syncRetrying \|\| conflict\) return;/);
  assert.match(persistence, /if \(error instanceof TripVersionConflictError\)/);
  assert.match(app, /重试同步/);
  assert.match(app, /旅行已被其他成员更新。/);
});

test("AI 重试复用上一条输入而不追加用户消息，高德失败保留文本并单独提示", async () => {
  const [chat, messages, executor, orchestrator] = await Promise.all([
    readFile(new URL("features/chat/hooks/useTravelChat.ts", root), "utf8"),
    readFile(new URL("features/chat/components/ChatMessageList.tsx", root), "utf8"),
    readFile(new URL("features/ai/tools/executor.ts", root), "utf8"),
    readFile(new URL("features/ai/core/orchestrator.ts", root), "utf8"),
  ]);
  assert.match(chat, /lastAiRequestRef\.current = \{ chatId: activeChatId, displayHistory, history: chatMessages, userMessage \}/);
  assert.match(chat, /await sendQuestion\(last\.userMessage, last\.history, last\.chatId, last\.displayHistory, true\);/);
  assert.match(chat, /setAiError\("AI 暂时不可用，请稍后重试。"\);/);
  assert.match(executor, /verifiedDataUnavailable/);
  assert.match(orchestrator, /executed\.verifiedDataUnavailable/);
  assert.match(messages, /实时地点数据暂不可用/);
  assert.match(messages, /重试实时数据/);
});
