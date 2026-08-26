import type { ItineraryItem } from "./model";

export const destinationPinyin: Record<string, string> = {
  北京: "BEIJING",
  上海: "SHANGHAI",
  广州: "GUANGZHOU",
  深圳: "SHENZHEN",
  杭州: "HANGZHOU",
  苏州: "SUZHOU",
  南京: "NANJING",
  成都: "CHENGDU",
  重庆: "CHONGQING",
  西安: "XIAN",
  武汉: "WUHAN",
  长沙: "CHANGSHA",
  厦门: "XIAMEN",
  三亚: "SANYA",
  昆明: "KUNMING",
  丽江: "LIJIANG",
  大理: "DALI",
  青岛: "QINGDAO",
  天津: "TIANJIN",
  香港: "HONGKONG",
  澳门: "MACAU",
};
export const getTripDestination = (title: string) =>
  title.split(/[·｜|—–-]/)[0].trim();
export const getDestinationPinyin = (title: string) => {
  const destination = getTripDestination(title);
  return destinationPinyin[destination] || destination.toUpperCase();
};
export const weekdayLabels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
export const getTripDays = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end < start)
    return [{ day: 1, date: "日期待定" }];

  const days = [];
  for (let date = new Date(start), day = 1; date <= end && day <= 31; day += 1) {
    days.push({
      day,
      date: `${date.getMonth() + 1}.${date.getDate()} ${weekdayLabels[date.getDay()]}`,
    });
    date.setDate(date.getDate() + 1);
  }
  return days;
};

/** Repairs only invalid persisted days; day 0 remains the supported pending state. */
export function clampItineraryDays(items: ItineraryItem[]): ItineraryItem[] {
  return items.map((item) => {
    const day = item.day ?? 1;
    return { ...item, day: !Number.isFinite(day) ? 1 : Math.min(31, Math.max(0, Math.trunc(day))) };
  });
}

/** Moves plans outside a shortened trip to the existing pending itinerary state. */
export function movePlansOutsideTripToPending(items: ItineraryItem[], lastDay: number): ItineraryItem[] {
  const safeLastDay = Math.max(1, Math.min(31, lastDay));
  return clampItineraryDays(items).map((item) => (item.day ?? 1) > safeLastDay ? { ...item, day: 0 } : item);
}
export const typeColors: Record<
  ItineraryItem["type"],
  { color: string; tint: string }
> = {
  交通: { color: "#e67b4a", tint: "#fff0e8" },
  餐饮: { color: "#55a174", tint: "#eaf6ee" },
  景点: { color: "#5598bd", tint: "#eaf4f9" },
  住宿: { color: "#846bb0", tint: "#f1edfa" },
  购物: { color: "#c06c8f", tint: "#fbeef3" },
  活动: { color: "#d48a3e", tint: "#fff5e6" },
  其他: { color: "#7d8d86", tint: "#eff2f0" },
};
export const classifyItinerary = (title: string): ItineraryItem["type"] => {
  const value = title.toLowerCase();
  if (/吃|喝|用餐|就餐|点餐|觅食|早餐|早饭|午餐|午饭|晚餐|晚饭|夜宵|下午茶|咖啡|奶茶|饮品|餐厅|饭店|小吃|美食/.test(value))
    return "餐饮";
  if (/酒店|民宿|入住|住宿|旅馆|客栈|房间|如家/.test(value)) return "住宿";
  if (/景区|公园|博物馆|游玩|西湖|乐园|古镇|展览|景点|寺|塔/.test(value))
    return "景点";
  if (/购物|商场|逛街|买|市集|菜场|免税店/.test(value)) return "购物";
  if (/高铁|火车|飞机|打车|地铁|公交|航班|车站|接送|租车/.test(value))
    return "交通";
  if (/演出|音乐会|活动|体验|课程|徒步/.test(value)) return "活动";
  return "其他";
};
export const parseTimeNumber = (value: string) => {
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) return numeric;

  const digits: Record<string, number> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  };
  if (value === "十") return 10;
  if (value.startsWith("十")) return 10 + (digits[value[1]] || 0);
  if (value.endsWith("十")) return (digits[value[0]] || 0) * 10;
  if (value.length === 3 && value[1] === "十")
    return (digits[value[0]] || 0) * 10 + (digits[value[2]] || 0);
  return digits[value] || 0;
};
export const parsePlanInput = (input: string): Pick<ItineraryItem, "title" | "time" | "type" | "note"> => {
  const value = input.trim();
  const type = classifyItinerary(value);
  const match = value.match(
    /(?:(上午|早上|中午|下午|晚上|傍晚)\s*)?(\d{1,2}|[一二三四五六七八九十]{1,3})(?:(?:\s*:\s*|\s*点\s*)(\d{1,2})\s*分?|\s*(?:点|时))?/,
  );
  let time = "";
  if (match) {
    let hour = parseTimeNumber(match[2]);
    const minute = Number(match[3] || 0);
    if (
      (match[1] === "下午" || match[1] === "晚上" || match[1] === "傍晚") &&
      hour < 12
    )
      hour += 12;
    if (match[1] === "中午" && hour < 11) hour += 12;
    time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
  const activity =
    value
      .replace(match?.[0] || "", "")
      .replace(/^(去|到|吃|在|安排|帮我安排)/, "")
      .trim() || value;
  const noteMatch = activity.match(
    /^(.*?)(?:[，,、；;]\s*|\s+)((?:备注\s*[:：]?\s*|注意|提醒|需(?:要)?|记得|提前|建议|别忘|务必).*)$/,
  );
  const title = noteMatch?.[1].trim() || activity;
  const note = noteMatch?.[2].trim();
  return { title, time, type, ...(note ? { note } : {}) };
};

export const parsePlanInputs = (input: string) => {
  const timePattern = /(上午|早上|中午|下午|晚上|傍晚)\s*(?:\d{1,2}|[一二三四五六七八九十]{1,3})(?:(?:\s*:\s*|\s*点\s*)\d{1,2}\s*分?|\s*(?:点|时))?/g;
  const matches = [...input.matchAll(timePattern)];
  if (matches.length < 2) return [parsePlanInput(input)];

  return matches.map((match, index) =>
    parsePlanInput(
      input
        .slice(match.index, matches[index + 1]?.index)
        .replace(/^[，,、；;\s]+|[，,、；;\s]+$/g, ""),
    ),
  );
};

export const planTimeValue = (plan: ItineraryItem) => {
  const match = plan.time?.match(/^(\d{1,2}):(\d{2})$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.MAX_SAFE_INTEGER;
};

export const sortItineraryItems = (plans: ItineraryItem[]) =>
  plans.map((plan): ItineraryItem => plan.type === "其他" && classifyItinerary(plan.title) === "餐饮" ? { ...plan, type: "餐饮" } : plan).sort(
    (first, second) =>
      (first.day ?? 1) - (second.day ?? 1) ||
      planTimeValue(first) - planTimeValue(second),
  );
