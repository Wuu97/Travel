import assert from "node:assert/strict";
import test from "node:test";
import { aiTestSources, compileTypeScript } from "./helpers/compile-typescript.mjs";

test("only verifies exact or strong POI name matches", async () => {
  const compilation = await compileTypeScript(aiTestSources, "travel-matching-");
  try {
    const { findBestTravelMatch } = await compilation.importModule("ai/enrichment/matching.js");
    const match = (query, names) => findBestTravelMatch(query, names.map((name) => ({ name })))?.name;
    assert.equal(match("成都大熊猫繁育研究基地", ["成都大熊猫繁育研究基地"]), "成都大熊猫繁育研究基地");
    assert.equal(match("陈麻婆豆腐", ["陈麻婆豆腐（骡马市店）"]), "陈麻婆豆腐（骡马市店）");
    assert.equal(match("成都大熊猫繁育研究基地", ["成都大熊猫繁育研究基地(西门)"]), "成都大熊猫繁育研究基地(西门)");
    assert.equal(match("成都大熊猫繁育研究基地", ["成都欢乐谷"]), undefined);
    assert.equal(match("不存在的测试餐厅", ["海底捞火锅"]), undefined);
    assert.equal(match("不存在的测试景点", ["武侯祠", "杜甫草堂", "宽窄巷子"]), undefined);
    assert.equal(match("人民", ["人民公园"]), undefined);
    assert.equal(match("武侯祠", ["成都武侯祠博物馆"]), "成都武侯祠博物馆");
    assert.equal(match("饕林餐厅", ["饕林餐厅（总府路店）"]), "饕林餐厅（总府路店）");
  } finally { await compilation.cleanup(); }
});
