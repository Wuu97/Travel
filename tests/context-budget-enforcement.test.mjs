import assert from "node:assert/strict";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

const sources = [
  "features/ai/core/client.ts",
  "features/ai/core/answerBudget.ts",
  "features/ai/schemas/context.ts",
  "features/ai/tools/types.ts",
  "features/ai/tools/executor.ts",
  "features/memory/model.ts",
  "features/ai/context-budget/constants.ts",
  "features/ai/context-budget/model.ts",
  "features/ai/context-budget/manager.ts",
  "features/ai/context-budget/history.ts",
  "features/ai/context-budget/contextLimiter.ts",
  "features/ai/context-budget/index.ts",
  "features/ai/core/toolResultReasoning.ts",
];

test("history budget retains recent turns and removes older turns by estimated tokens", async () => {
  const compilation = await compileTypeScript(sources, "travel-history-budget-");
  try {
    const { trimHistoryByBudget } = await compilation.importModule("ai/context-budget/history.js");
    const history = Array.from({ length: 20 }, (_, index) => ({ role: index % 2 ? "assistant" : "user", content: `${index}:${"内容".repeat(100)}` }));
    const trimmed = trimHistoryByBudget(history, 1_000);
    assert.ok(trimmed.length < history.length);
    assert.equal(trimmed.at(-1)?.content, history.at(-1)?.content);
    assert.ok(!trimmed.some((message) => message.content === history[0]?.content));
    const oversizedLatest = trimHistoryByBudget([{ role: "user", content: "旧消息" }, { role: "assistant", content: "最新消息".repeat(1_000) }], 20);
    assert.equal(oversizedLatest.length, 1);
    assert.match(oversizedLatest[0]?.content ?? "", /^最新消息/);
  } finally { await compilation.cleanup(); }
});

test("history limiter keeps system instructions and normal empty history behavior", async () => {
  const compilation = await compileTypeScript(sources, "travel-history-empty-");
  try {
    const { trimHistoryByBudget } = await compilation.importModule("ai/context-budget/history.js");
    assert.deepEqual(trimHistoryByBudget([], 100), []);
    assert.deepEqual(trimHistoryByBudget([{ role: "system", content: "规则" }], 0), [{ role: "system", content: "规则" }]);
  } finally { await compilation.cleanup(); }
});

test("tool reasoning sends only budgeted provider facts", async () => {
  const compilation = await compileTypeScript(sources, "travel-tool-enforcement-");
  try {
    const { reasonOverToolResults } = await compilation.importModule("ai/core/toolResultReasoning.js");
    let prompt = "";
    const data = { places: [], restaurants: Array.from({ length: 50 }, (_, index) => ({ id: `r${index}`, name: `餐厅${index}` })), routes: [] };
    await reasonOverToolResults({ message: "推荐餐厅", firstAnswer: "回答", data, toolResultBudget: 1_000 }, async (messages) => { prompt = messages[1].content; return '{"answer":"回答"}'; });
    const payload = JSON.parse(prompt);
    assert.ok(payload.verifiedTravelData.restaurants.length <= 10);
  } finally { await compilation.cleanup(); }
});

test("context limiter enforces a total text allowance without affecting small context", async () => {
  const compilation = await compileTypeScript(sources, "travel-context-enforcement-");
  try {
    const { estimateTokenCount } = await compilation.importModule("ai/context-budget/manager.js");
    const { limitContextText } = await compilation.importModule("ai/context-budget/contextLimiter.js");
    assert.equal(limitContextText("[Travel Context]\\n新疆", 100), "[Travel Context]\\n新疆");
    const bounded = limitContextText(`[Travel Context]\\n${"新疆".repeat(2_000)}\\n[User Preference]\\n自然`, 100);
    assert.ok(estimateTokenCount(bounded) <= 100);
    assert.match(bounded, /^\[Travel Context\]/);
  } finally { await compilation.cleanup(); }
});
