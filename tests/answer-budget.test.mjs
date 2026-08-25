import assert from "node:assert/strict";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

const sources = ["features/ai/core/answerBudget.ts", "features/ai/core/client.ts", "features/ai/schemas/context.ts"];

test("selects an answer budget from lightweight travel request signals", async () => {
  const compilation = await compileTypeScript(sources, "travel-answer-budget-");
  try {
    const { ANSWER_BUDGET, getAnswerBudget } = await compilation.importModule("core/answerBudget.js");
    assert.equal(getAnswerBudget({ message: "成都几月份适合去" }), ANSWER_BUDGET.simple);
    assert.equal(getAnswerBudget({ message: "武侯祠值得去吗" }), ANSWER_BUDGET.simple);
    assert.equal(getAnswerBudget({ message: "武侯祠怎么玩" }), ANSWER_BUDGET.guide);
    assert.equal(getAnswerBudget({ message: "成都3天怎么玩" }), ANSWER_BUDGET.shortTrip);
    assert.equal(getAnswerBudget({ message: "北疆10天自驾怎么玩" }), ANSWER_BUDGET.longTrip);
    assert.equal(getAnswerBudget({ message: "云南自由行攻略" }), ANSWER_BUDGET.guide);
  } finally { await compilation.cleanup(); }
});

test("passes the calculated budget to the existing LLM client request", async () => {
  const compilation = await compileTypeScript(sources, "travel-answer-budget-client-");
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.DEEPSEEK_API_KEY;
  try {
    const { requestLlmCompletion } = await compilation.importModule("core/client.js");
    process.env.DEEPSEEK_API_KEY = "test-key";
    let body;
    globalThis.fetch = async (_url, options) => { body = JSON.parse(String(options?.body)); return new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] })); };
    await requestLlmCompletion([{ role: "user", content: "北疆10天自驾怎么玩" }], { maxTokens: 4000 });
    assert.equal(body.max_tokens, 4000);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = originalKey;
    await compilation.cleanup();
  }
});
