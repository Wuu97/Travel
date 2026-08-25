import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const sources = [
  "features/ai/enrichment/enrichReply.ts", "features/ai/enrichment/places.ts", "features/ai/enrichment/restaurants.ts", "features/ai/enrichment/routes.ts", "features/ai/enrichment/richContent.ts",
  "features/ai/providers/amap/client.ts", "features/ai/providers/amap/index.ts", "features/ai/providers/amap/mapper.ts", "features/ai/providers/amap/places.ts", "features/ai/providers/amap/restaurants.ts", "features/ai/providers/amap/routes.ts", "features/ai/providers/amap/types.ts", "features/ai/providers/types.ts",
  "features/ai/tools/places.ts", "features/ai/tools/restaurants.ts", "features/ai/tools/routes.ts", "features/ai/tools/types.ts", "features/chat/model.ts", "features/trip/model.ts",
];

test("only verifies exact or strong POI name matches", async () => {
  const output = await mkdtemp(join(tmpdir(), "travel-matching-"));
  try {
    await execFileAsync(join(process.cwd(), "node_modules/.bin/tsc"), ["--target", "ES2022", "--module", "commonjs", "--moduleResolution", "node", "--skipLibCheck", "--outDir", output, ...sources], { cwd: new URL("../", import.meta.url) });
    const { findBestTravelMatch } = await import(new URL(`file://${join(output, "ai/enrichment/enrichReply.js")}`).href);
    const match = (query, names) => findBestTravelMatch(query, names.map((name) => ({ name })))?.name;

    assert.equal(match("成都大熊猫繁育研究基地", ["成都大熊猫繁育研究基地"]), "成都大熊猫繁育研究基地");
    assert.equal(match("陈麻婆豆腐", ["陈麻婆豆腐（骡马市店）"]), "陈麻婆豆腐（骡马市店）");
    assert.equal(match("成都大熊猫繁育研究基地", ["成都大熊猫繁育研究基地(西门)"]), "成都大熊猫繁育研究基地(西门)");
    assert.equal(match("成都大熊猫繁育研究基地", ["成都欢乐谷"]), undefined);
    assert.equal(match("不存在的测试餐厅", ["海底捞火锅"]), undefined);
    assert.equal(match("不存在的测试景点", ["武侯祠", "杜甫草堂", "宽窄巷子"]), undefined);
    assert.equal(match("人民", ["人民公园"]), undefined);
    assert.equal(match("武侯祠", ["成都武侯祠博物馆"]), "成都武侯祠博物馆");
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
