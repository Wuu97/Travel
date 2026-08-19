"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const services = [
  { icon: "🚄", name: "火车票", note: "高铁 · 动车 · 普速" },
  { icon: "✈️", name: "机票", note: "国内 · 国际 · 特价" },
  { icon: "⌂", name: "酒店", note: "精选住宿 · 民宿" },
  { icon: "⌁", name: "路线", note: "智能规划 · 导航" },
];
type ItineraryItem = {
  id: string;
  title: string;
  type: "景点" | "餐饮" | "活动" | "交通" | "住宿" | "购物" | "其他";
  day?: number;
  date?: string;
  time?: string;
  location?: string;
  note?: string;
  creator?: string;
};
type ExpenseItem = {
  id: string;
  title: string;
  amount: number;
  type: "住宿" | "餐饮" | "交通" | "门票" | "活动" | "其他";
  occurrence: "estimated" | "actual";
  relatedItineraryItemId?: string;
  relatedItineraryTitle?: string;
  note?: string;
};
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  itineraryItems?: ItineraryItem[];
  expenseItems?: ExpenseItem[];
};
type SavedChat = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
};
type LedgerItem = {
  id: string;
  item: string;
  type: ExpenseItem["type"];
  amount: number;
  by: string;
  relatedItineraryItemId?: string;
  relatedItineraryTitle?: string;
};
type StoredTrip = {
  expenses: LedgerItem[];
  budgetItems: ExpenseItem[];
  plans: ItineraryItem[];
};
type TripDetails = {
  title: string;
  status: "筹备中" | "进行中" | "已结束";
  startDate: string;
  endDate: string;
  companions: string[];
  memberRoles?: Record<string, "编辑者" | "查看者">;
  coverImage?: string;
};
type TripApiResponse = { trip: StoredTrip | null };

const DEFAULT_TRIP_ID = "hangzhou-summer-trip";

const subscribeToHydration = () => () => {};
const getClientHydrationState = () => true;
const getServerHydrationState = () => false;

const itineraryTypes = [
  "交通",
  "餐饮",
  "景点",
  "住宿",
  "购物",
  "活动",
  "其他",
] as const;
const defaultExpenses: LedgerItem[] = [
  {
    id: "expense-stay",
    item: "民宿 · 西湖边",
    type: "住宿",
    amount: 628,
    by: "林",
  },
  {
    id: "expense-lunch",
    item: "知味观午餐",
    type: "餐饮",
    amount: 168,
    by: "你",
    relatedItineraryItemId: "plan-lunch",
    relatedItineraryTitle: "知味观 · 午餐",
  },
  {
    id: "expense-train",
    item: "杭州东 → 上海虹桥",
    type: "交通",
    amount: 292,
    by: "安",
  },
];
const defaultPlans: ItineraryItem[] = [
  {
    id: "plan-arrival",
    title: "抵达杭州东站",
    type: "交通",
    time: "09:30",
    day: 1,
    creator: "你",
  },
  {
    id: "plan-lunch",
    title: "知味观 · 午餐",
    type: "餐饮",
    time: "11:30",
    day: 1,
    creator: "林",
  },
  {
    id: "plan-bike",
    title: "西湖边骑行",
    type: "景点",
    time: "14:30",
    day: 1,
    creator: "AI",
  },
];
const getDefaultStoredTrip = (): StoredTrip => ({
  expenses: defaultExpenses,
  budgetItems: [],
  plans: defaultPlans,
});
const defaultTripDetails: TripDetails = {
  title: "杭州 · 夏末两日",
  status: "进行中",
  startDate: "2026-08-16",
  endDate: "2026-08-18",
  companions: ["你", "林", "安"],
};
const statusTagColors: Record<TripDetails["status"], { background: string; color: string }> = {
  筹备中: { background: "#fff1dc", color: "#a86522" },
  进行中: { background: "#e5f4ea", color: "#337b50" },
  已结束: { background: "#e9edf0", color: "#65727a" },
};
const destinationPinyin: Record<string, string> = {
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
const getDestinationPinyin = (title: string) => {
  const destination = title.split(/[·｜|—–-]/)[0].trim();
  return destinationPinyin[destination] || destination.toUpperCase();
};
const weekdayLabels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const getTripDays = (startDate: string, endDate: string) => {
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
const typeColors: Record<
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
const classifyItinerary = (title: string): ItineraryItem["type"] => {
  const value = title.toLowerCase();
  if (/酒店|民宿|入住|住宿|旅馆|客栈|房间|如家/.test(value)) return "住宿";
  if (/景区|公园|博物馆|游玩|西湖|乐园|古镇|展览|景点|寺|塔/.test(value))
    return "景点";
  if (/餐厅|吃饭|午餐|晚餐|早餐|咖啡|奶茶|美食|饭店|小吃/.test(value))
    return "餐饮";
  if (/购物|商场|逛街|买|市集|菜场|免税店/.test(value)) return "购物";
  if (/高铁|火车|飞机|打车|地铁|公交|航班|车站|接送|租车/.test(value))
    return "交通";
  if (/演出|音乐会|活动|体验|课程|徒步/.test(value)) return "活动";
  return "其他";
};
const parseTimeNumber = (value: string) => {
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
const parsePlanInput = (input: string) => {
  const value = input.trim();
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
  return { title, time, type: classifyItinerary(title), ...(note ? { note } : {}) };
};

const parsePlanInputs = (input: string) => {
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

const planTimeValue = (plan: ItineraryItem) => {
  const match = plan.time?.match(/^(\d{1,2}):(\d{2})$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.MAX_SAFE_INTEGER;
};

const sortItineraryItems = (plans: ItineraryItem[]) =>
  [...plans].sort(
    (first, second) =>
      (first.day || 1) - (second.day || 1) ||
      planTimeValue(first) - planTimeValue(second),
  );

function loadStoredTrip(): StoredTrip {
  if (typeof window === "undefined") return getDefaultStoredTrip();
  try {
    const data = JSON.parse(
      localStorage.getItem("tuyu-local-trip") || "{}",
    ) as Partial<StoredTrip>;
    return {
      expenses: Array.isArray(data.expenses)
        ? data.expenses.map((item) => ({
            ...item,
            id: item.id || `expense-${item.item}-${item.amount}`,
          }))
        : defaultExpenses,
      budgetItems: Array.isArray(data.budgetItems) ? data.budgetItems : [],
      plans: Array.isArray(data.plans)
        ? sortItineraryItems(data.plans.map((item, index) =>
            typeof item === "string"
              ? {
                  id: `legacy-plan-${index}-${item}`,
                  title: item,
                  type: ["交通", "餐饮", "景点"][
                    index % 3
                  ] as ItineraryItem["type"],
                  day: 1,
                }
              : item,
          ))
        : defaultPlans,
    };
  } catch {
    return getDefaultStoredTrip();
  }
}

function loadTripDetails(): TripDetails {
  if (typeof window === "undefined") return defaultTripDetails;
  try {
    const value = JSON.parse(
      localStorage.getItem("tuyu-trip-details") || "{}",
    ) as Partial<TripDetails>;
    const companions =
      Array.isArray(value.companions) &&
      value.companions.every((name) => typeof name === "string")
        ? value.companions.filter(Boolean)
        : defaultTripDetails.companions;
    const memberRoles =
      value.memberRoles && typeof value.memberRoles === "object"
        ? companions.reduce<Record<string, "编辑者" | "查看者">>(
            (roles, companion) => {
              const role = value.memberRoles?.[companion];
              if (role === "编辑者" || role === "查看者")
                roles[companion] = role;
              return roles;
            },
            {},
          )
        : undefined;
    return {
      title:
        typeof value.title === "string" && value.title.trim()
          ? value.title
          : defaultTripDetails.title,
      status:
        value.status === "筹备中" || value.status === "进行中" || value.status === "已结束"
          ? value.status
          : defaultTripDetails.status,
      startDate:
        typeof value.startDate === "string"
          ? value.startDate
          : defaultTripDetails.startDate,
      endDate:
        typeof value.endDate === "string" ? value.endDate : defaultTripDetails.endDate,
      companions,
      memberRoles:
        memberRoles && Object.keys(memberRoles).length ? memberRoles : undefined,
      coverImage:
        typeof value.coverImage === "string" && value.coverImage.startsWith("data:image/")
          ? value.coverImage
          : undefined,
    };
  } catch {
    return defaultTripDetails;
  }
}

function normalizeChatMessage(value: unknown): ChatMessage | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (raw.role !== "user" && raw.role !== "assistant") return null;
  const objectContent =
    raw.content && typeof raw.content === "object"
      ? (raw.content as Record<string, unknown>)
      : null;
  const partsContent = Array.isArray(raw.parts)
    ? raw.parts
        .map((part) =>
          typeof part === "string"
            ? part
            : part &&
                typeof part === "object" &&
                typeof (part as Record<string, unknown>).text === "string"
              ? (part as Record<string, string>).text
              : "",
        )
        .join("")
    : "";
  const content =
    typeof raw.content === "string"
      ? raw.content
      : typeof raw.markdown === "string"
        ? raw.markdown
        : typeof raw.text === "string"
          ? raw.text
          : typeof objectContent?.text === "string"
            ? objectContent.text
            : partsContent;
  return {
    role: raw.role,
    content,
    itineraryItems: Array.isArray(raw.itineraryItems)
      ? (raw.itineraryItems as ItineraryItem[])
      : [],
    expenseItems: Array.isArray(raw.expenseItems)
      ? (raw.expenseItems as ExpenseItem[])
      : [],
  };
}

function normalizeAssistantResponse(
  value: unknown,
  fallback: string,
): ChatMessage {
  let payload = value;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return {
        role: "assistant",
        content: payload,
        itineraryItems: [],
        expenseItems: [],
      };
    }
  }
  const message = normalizeChatMessage({
    ...(payload && typeof payload === "object" ? payload : {}),
    role: "assistant",
  });
  return message && message.content.trim()
    ? message
    : {
        role: "assistant",
        content: fallback,
        itineraryItems: [],
        expenseItems: [],
      };
}

function loadSavedChats(): SavedChat[] {
  if (typeof window === "undefined") return [];
  try {
    return (
      JSON.parse(localStorage.getItem("tuyu-ai-history") || "[]") as Array<
        Partial<SavedChat>
      >
    )
      .filter(
        (
          chat,
        ): chat is Partial<SavedChat> &
          Pick<SavedChat, "id" | "title" | "messages"> =>
          Boolean(chat.id && chat.title && Array.isArray(chat.messages)),
      )
      .map((chat) => ({
        id: chat.id,
        title: chat.title,
        messages: chat.messages
          .map(normalizeChatMessage)
          .filter((message): message is ChatMessage => Boolean(message)),
        createdAt:
          typeof chat.createdAt === "number"
            ? chat.createdAt
            : typeof chat.updatedAt === "number"
              ? chat.updatedAt
              : Date.now(),
        updatedAt:
          typeof chat.updatedAt === "number" ? chat.updatedAt : Date.now(),
      }))
      .sort((first, second) => second.createdAt - first.createdAt);
  } catch {
    return [];
  }
}

function TravelApp({ loadPersistedState }: { loadPersistedState: boolean }) {
  const [active, setActive] = useState(0);
  const [from, setFrom] = useState("上海");
  const [to, setTo] = useState("杭州");
  const [notice, setNotice] = useState("");
  const [question, setQuestion] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [tripId] = useState(() => {
    if (!loadPersistedState) return DEFAULT_TRIP_ID;
    return new URLSearchParams(window.location.search).get("trip") || DEFAULT_TRIP_ID;
  });
  const [initialTrip] = useState(() =>
    loadPersistedState ? loadStoredTrip() : getDefaultStoredTrip(),
  );
  const [tripDetails, setTripDetails] = useState(() =>
    loadPersistedState ? loadTripDetails() : defaultTripDetails,
  );
  const [initialChats] = useState(() =>
    loadPersistedState ? loadSavedChats() : [],
  );
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(
    () => initialChats[0]?.messages ?? [],
  );
  const [savedChats, setSavedChats] = useState<SavedChat[]>(initialChats);
  const [activeChatId, setActiveChatId] = useState(
    () => initialChats[0]?.id ?? "current",
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<"plan" | "budget">("plan");
  const [shared, setShared] = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [expenses, setExpenses] = useState<LedgerItem[]>(initialTrip.expenses);
  const [budgetItems, setBudgetItems] = useState<ExpenseItem[]>(
    initialTrip.budgetItems,
  );
  const [showExpense, setShowExpense] = useState(false);
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [newPlan, setNewPlan] = useState("");
  const [editingPlan, setEditingPlan] = useState<ItineraryItem | null>(null);
  const [inlineTripTitle, setInlineTripTitle] = useState<string | null>(null);
  const [inlinePlanEdit, setInlinePlanEdit] = useState<{
    id: string;
    field: "title" | "note";
    value: string;
  } | null>(null);
  const [tripPopover, setTripPopover] = useState<
    "status" | "dates" | "members" | "settings" | null
  >(null);
  const [editingMemberRole, setEditingMemberRole] = useState<string | null>(
    null,
  );
  const [newMember, setNewMember] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [manualPlan, setManualPlan] = useState<ItineraryItem | null>(null);
  const [openPlanMenuId, setOpenPlanMenuId] = useState<string | null>(null);
  const [pendingPlanScrollId, setPendingPlanScrollId] = useState<string | null>(
    null,
  );
  const [plans, setPlans] = useState<ItineraryItem[]>(initialTrip.plans);
  const [remoteSyncReady, setRemoteSyncReady] = useState(false);
  const [selectedImports, setSelectedImports] = useState<
    Record<string, boolean>
  >({});
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const historyPanelRef = useRef<HTMLDivElement>(null);
  const planMenuRef = useRef<HTMLDivElement>(null);
  const timelineListRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const inlineEditorRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const tripPopoverRef = useRef<HTMLDivElement>(null);
  const memberRoleRef = useRef<HTMLDivElement>(null);

  const announceSave = () => {
    setSaveStatus("saving");
    window.setTimeout(() => setSaveStatus("saved"), 180);
    window.setTimeout(() => setSaveStatus("idle"), 1500);
  };

  const service = services[active];
  const tripDays = getTripDays(tripDetails.startDate, tripDetails.endDate);
  const search = () =>
    setNotice(`正在为你查找 ${from} → ${to} 的${service.name}…`);
  useLayoutEffect(() => {
    // The first restore runs in the document head before paint. This handles
    // late content/layout changes and keeps the position updated for reload.
    if ("scrollRestoration" in window.history)
      window.history.scrollRestoration = "manual";
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
    const savedPosition = sessionStorage.getItem("tuyu-scroll-position");
    if (savedPosition) window.scrollTo(0, Number(savedPosition));
    const savePosition = () =>
      sessionStorage.setItem("tuyu-scroll-position", String(window.scrollY));
    window.addEventListener("pagehide", savePosition);
    window.addEventListener("beforeunload", savePosition);
    return () => {
      window.removeEventListener("pagehide", savePosition);
      window.removeEventListener("beforeunload", savePosition);
    };
  }, []);
  useEffect(() => {
    if (!loadPersistedState) return;
    localStorage.setItem(
      "tuyu-local-trip",
      JSON.stringify({ expenses, budgetItems, plans }),
    );
  }, [expenses, budgetItems, plans, loadPersistedState]);
  useEffect(() => {
    if (!loadPersistedState) return;
    localStorage.setItem("tuyu-trip-details", JSON.stringify(tripDetails));
  }, [loadPersistedState, tripDetails]);
  useEffect(() => {
    if (!loadPersistedState) return;

    let cancelled = false;
    const loadSharedTrip = async () => {
      try {
        const response = await fetch(`/api/trips?tripId=${encodeURIComponent(tripId)}`);
        if (!response.ok) return;
        const data = (await response.json()) as TripApiResponse;
        if (cancelled) return;

        if (data.trip) {
          setExpenses(data.trip.expenses);
          setBudgetItems(data.trip.budgetItems);
          setPlans(sortItineraryItems(data.trip.plans));
        }
        setRemoteSyncReady(true);
      } catch {
        // Local storage remains available when D1 is not configured.
      }
    };

    void loadSharedTrip();
    return () => {
      cancelled = true;
    };
  }, [loadPersistedState, tripId]);
  useEffect(() => {
    if (!remoteSyncReady) return;

    const timer = window.setTimeout(() => {
      void fetch(`/api/trips?tripId=${encodeURIComponent(tripId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip: { expenses, budgetItems, plans } }),
      });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [expenses, budgetItems, plans, remoteSyncReady, tripId]);
  useEffect(() => {
    const chatArea = chatScrollRef.current;
    if (!chatArea) return;
    requestAnimationFrame(() =>
      chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: "smooth" }),
    );
  }, [chatMessages, aiBusy]);
  useEffect(() => {
    if (!pendingPlanScrollId) return;
    const frame = requestAnimationFrame(() => {
      const timeline = timelineListRef.current;
      const plan = timeline?.querySelector<HTMLElement>(
        `[data-plan-id="${pendingPlanScrollId}"]`,
      );
      if (timeline && plan) {
        const timelineBounds = timeline.getBoundingClientRect();
        const planBounds = plan.getBoundingClientRect();
        timeline.scrollBy({
          top:
            planBounds.top -
            timelineBounds.top -
            timeline.clientHeight / 2 +
            planBounds.height / 2,
          behavior: "smooth",
        });
      }
      setPendingPlanScrollId(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [activeDay, pendingPlanScrollId, plans]);
  useEffect(() => {
    if (!historyOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!historyPanelRef.current?.contains(event.target as Node))
        setHistoryOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [historyOpen]);
  useEffect(() => {
    if (!openPlanMenuId) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!planMenuRef.current?.contains(event.target as Node))
        setOpenPlanMenuId(null);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [openPlanMenuId]);
  useEffect(() => {
    if (!tripPopover) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!tripPopoverRef.current?.contains(event.target as Node))
        setTripPopover(null);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [tripPopover]);
  useEffect(() => {
    if (!editingMemberRole) return;
    const closeRoleMenu = (event: MouseEvent) => {
      if (!memberRoleRef.current?.contains(event.target as Node))
        setEditingMemberRole(null);
    };
    document.addEventListener("mousedown", closeRoleMenu);
    return () => document.removeEventListener("mousedown", closeRoleMenu);
  }, [editingMemberRole]);
  useEffect(() => {
    if (inlineTripTitle === null && !inlinePlanEdit) return;
    const frame = requestAnimationFrame(() => inlineEditorRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [inlinePlanEdit, inlineTripTitle]);
  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !chatMessages.length) return;
    const latest = chatMessages.at(-1)!;
    console.debug("[chat] rendered message fields", {
      content: latest.content,
      itineraryItems: latest.itineraryItems,
      expenseItems: latest.expenseItems,
    });
  }, [chatMessages]);
  const saveChat = (messages: ChatMessage[]) => {
    const firstUserMessage =
      messages.find((message) => message.role === "user")?.content || "新对话";
    setSavedChats((current) => {
      const previous = current.find((item) => item.id === activeChatId);
      const chat: SavedChat = {
        id: activeChatId,
        title: firstUserMessage.slice(0, 18),
        createdAt: previous?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
        messages,
      };
      const next = [chat, ...current.filter((item) => item.id !== activeChatId)]
        .sort((first, second) => second.createdAt - first.createdAt)
        .slice(0, 20);
      localStorage.setItem("tuyu-ai-history", JSON.stringify(next));
      return next;
    });
  };
  const ask = async () => {
    if (!question.trim() || aiBusy) return;
    const userMessage = question.trim();
    const history = chatMessages;
    const userMessages = [
      ...history,
      { role: "user" as const, content: userMessage },
    ];
    setQuestion("");
    setChatMessages(userMessages);
    setAiBusy(true);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, history }),
      });
      const data = await response.json();
      if (process.env.NODE_ENV === "development")
        console.debug("[chat] API response", data);
      const assistantMessage = normalizeAssistantResponse(
        data.reply ?? data,
        data.error || "暂时无法生成回复。",
      );
      if (process.env.NODE_ENV === "development")
        console.debug("[chat] final message", {
          content: assistantMessage.content,
          itineraryItems: assistantMessage.itineraryItems,
          expenseItems: assistantMessage.expenseItems,
        });
      const messages = [...userMessages, assistantMessage];
      setChatMessages(messages);
      saveChat(messages);
    } catch {
      const messages = [
        ...userMessages,
        {
          role: "assistant" as const,
          content: "无法连接 AI 服务，请检查本地预览是否正在运行。",
        },
      ];
      setChatMessages(messages);
      saveChat(messages);
    } finally {
      setAiBusy(false);
    }
  };
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  const addExpense = () => {
    const amount = Number(expenseAmount);
    if (!expenseName.trim() || !amount) return;
    setExpenses([
      {
        id: `expense-${Date.now()}`,
        item: expenseName,
        type: "其他",
        amount,
        by: "你",
        relatedItineraryItemId: undefined,
        relatedItineraryTitle: undefined,
      },
      ...expenses,
    ]);
    setExpenseName("");
    setExpenseAmount("");
    setShowExpense(false);
  };
  const addPlan = () => {
    if (!newPlan.trim()) return;
    const parsedPlans = parsePlanInputs(newPlan);
    const timestamp = Date.now();
    setPlans((current) =>
      sortItineraryItems([
        ...current,
        ...parsedPlans.map((plan, index) => ({
          id: `plan-${timestamp}-${index}`,
          ...plan,
          day: activeDay,
          creator: "你",
        })),
      ]),
    );
    setPendingPlanScrollId(`plan-${timestamp}-${parsedPlans.length - 1}`);
    setNewPlan("");
  };
  const savePlan = () => {
    if (!editingPlan?.title.trim()) return;
    setPlans((current) =>
      sortItineraryItems(current.map((plan) =>
        plan.id === editingPlan.id
          ? { ...editingPlan, title: editingPlan.title.trim() }
          : plan,
      )),
    );
    setEditingPlan(null);
  };
  const updateTripDetails = (patch: Partial<TripDetails>) => {
    setTripDetails((current) => {
      const nextDetails = { ...current, ...patch };
      if (!getTripDays(nextDetails.startDate, nextDetails.endDate).some(
      (item) => item.day === activeDay,
    ))
      setActiveDay(1);
      return nextDetails;
    });
    announceSave();
  };
  const saveInlineTripTitle = () => {
    if (inlineTripTitle?.trim()) updateTripDetails({ title: inlineTripTitle.trim() });
    setInlineTripTitle(null);
  };
  const saveInlinePlan = () => {
    if (!inlinePlanEdit) return;
    const value = inlinePlanEdit.value.trim();
    if (inlinePlanEdit.field === "title" && !value) {
      setInlinePlanEdit(null);
      return;
    }
    setPlans((current) => current.map((plan) =>
      plan.id === inlinePlanEdit.id
        ? { ...plan, [inlinePlanEdit.field]: value || undefined }
        : plan,
    ));
    setInlinePlanEdit(null);
    announceSave();
  };
  const chooseCoverImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/") || file.size > 2 * 1024 * 1024)
      return;
    const reader = new FileReader();
    reader.onload = () =>
      setTripDetails((current) => ({
        ...current,
        coverImage: typeof reader.result === "string" ? reader.result : undefined,
      }));
    reader.readAsDataURL(file);
  };
  const deletePlan = (id: string) => {
    if (!window.confirm("确定删除这条行程吗？")) return;
    setPlans((current) => current.filter((plan) => plan.id !== id));
  };
  const copyPlan = (plan: ItineraryItem) => {
    const copyId = `plan-${Date.now()}`;
    setPlans((current) =>
      sortItineraryItems([
        ...current,
        { ...plan, id: copyId, title: `${plan.title}（副本）` },
      ]),
    );
    setPendingPlanScrollId(copyId);
    setOpenPlanMenuId(null);
  };
  const openManualPlan = () =>
    setManualPlan({
      id: `plan-${Date.now()}`,
      title: "",
      type: "交通",
      time: "",
      day: activeDay,
      creator: "你",
    });
  const saveManualPlan = () => {
    if (!manualPlan?.title.trim()) return;
    setPlans((current) =>
      sortItineraryItems([
        ...current,
        { ...manualPlan, title: manualPlan.title.trim() },
      ]),
    );
    setActiveDay(manualPlan.day || activeDay);
    setPendingPlanScrollId(manualPlan.id);
    setManualPlan(null);
  };
  const isPlanAdded = (item: ItineraryItem) =>
    plans.some(
      (plan) => plan.id === item.id || plan.title.trim() === item.title.trim(),
    );
  const isExpenseAdded = (
    item: ExpenseItem,
    destination: "budget" | "ledger",
  ) =>
    (destination === "budget" ? budgetItems : expenses).some((existing) =>
      destination === "budget"
        ? existing.id === item.id ||
          (existing.title === item.title && existing.amount === item.amount)
        : existing.id === item.id ||
          (existing.item === item.title && existing.amount === item.amount),
    );
  const addItineraryItems = (items: ItineraryItem[]) =>
    setPlans((current) =>
      sortItineraryItems([
        ...current,
        ...items
          .filter(
            (item) =>
              !current.some(
                (plan) =>
                  plan.id === item.id ||
                  plan.title.trim() === item.title.trim(),
              ),
          )
          .map((item) => ({ ...item, creator: item.creator || "AI" })),
      ]),
    );
  const addExpenseItems = (
    items: ExpenseItem[],
    destination: "budget" | "ledger",
  ) => {
    if (destination === "budget")
      setBudgetItems((current) => [
        ...current,
        ...items.filter(
          (item) =>
            !current.some(
              (existing) =>
                existing.id === item.id ||
                (existing.title === item.title &&
                  existing.amount === item.amount),
            ),
        ),
      ]);
    else
      setExpenses((current) => [
        ...current,
        ...items
          .filter(
            (item) =>
              !current.some(
                (existing) =>
                  existing.id === item.id ||
                  (existing.item === item.title &&
                    existing.amount === item.amount),
              ),
          )
          .map((item) => ({
            id: item.id,
            item: item.title,
            type: item.type,
            amount: item.amount,
            by: "你",
            relatedItineraryItemId: item.relatedItineraryItemId,
            relatedItineraryTitle: item.relatedItineraryTitle,
          })),
      ]);
  };
  const toggleImport = (id: string) =>
    setSelectedImports((current) => ({ ...current, [id]: !current[id] }));
  const newChat = () => {
    setActiveChatId(`chat-${Date.now()}`);
    setChatMessages([]);
    setQuestion("");
    setHistoryOpen(false);
  };
  const openChat = (chat: SavedChat) => {
    setActiveChatId(chat.id);
    setChatMessages(chat.messages);
    setHistoryOpen(false);
  };
  const deleteChat = (
    event: React.MouseEvent<HTMLButtonElement>,
    chatId: string,
  ) => {
    event.stopPropagation();
    if (!window.confirm("确定删除这段本地对话吗？此操作无法撤销。")) return;
    setSavedChats((current) => {
      const next = current.filter((chat) => chat.id !== chatId);
      localStorage.setItem("tuyu-ai-history", JSON.stringify(next));
      return next;
    });
    if (chatId === activeChatId) newChat();
  };
  const exportChat = () => {
    if (!chatMessages.length) return;
    const title =
      savedChats.find((chat) => chat.id === activeChatId)?.title ||
      "途遇 AI 对话";
    const content = [
      `途遇 AI 对话记录`,
      `主题：${title}`,
      `导出时间：${new Date().toLocaleString("zh-CN")}`,
      "",
      ...chatMessages.map(
        (message) =>
          `${message.role === "user" ? "我" : "途遇 AI"}：\n${message.content}`,
      ),
    ].join("\n\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${title.replace(/[\\/:*?"<>|]/g, "-")}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const copyInviteLink = async () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?trip=${encodeURIComponent(tripId)}`;
    try {
      if (navigator.clipboard?.writeText)
        await navigator.clipboard.writeText(inviteUrl);
      else {
        const input = document.createElement("textarea");
        input.value = inviteUrl;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        if (!copied) throw new Error("Copy command failed");
      }
      setShared(true);
      setShareStatus("copied");
    } catch {
      setShared(true);
      setShareStatus("failed");
    }
  };
  const jumpTo = (
    event: React.MouseEvent<HTMLAnchorElement>,
    target: string,
  ) => {
    event.preventDefault();
    document
      .querySelector(target)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  };
  const renderImportPanel = (message: ChatMessage) => {
    const itineraryItems = message.itineraryItems || [];
    const expenseItems = message.expenseItems || [];
    if (!itineraryItems.length && !expenseItems.length) return null;
    const selectedItineraries = itineraryItems.filter(
      (item) => selectedImports[`plan-${item.id}`],
    );
    const selectedBudget = expenseItems.filter(
      (item) =>
        item.occurrence === "estimated" && selectedImports[`budget-${item.id}`],
    );
    const selectedLedger = expenseItems.filter(
      (item) =>
        item.occurrence === "actual" && selectedImports[`ledger-${item.id}`],
    );
    return (
      <div className="ai-imports">
        {itineraryItems.length > 0 && (
          <section>
            <header>
              <b>可导入行程</b>
              {selectedItineraries.length > 0 && (
                <button onClick={() => addItineraryItems(selectedItineraries)}>
                  添加已选 {selectedItineraries.length} 项
                </button>
              )}
            </header>
            {itineraryItems.map((item) => (
              <div className="import-row" key={item.id}>
                <input
                  aria-label={`选择${item.title}`}
                  type="checkbox"
                  checked={Boolean(selectedImports[`plan-${item.id}`])}
                  onChange={() => toggleImport(`plan-${item.id}`)}
                  disabled={isPlanAdded(item)}
                />
                <div>
                  <strong>{item.title}</strong>
                  <small>
                    {item.type}
                    {item.day ? ` · DAY ${item.day}` : ""}
                    {item.date ? ` · ${item.date}` : ""}
                    {item.time ? ` ${item.time}` : ""}
                  </small>
                </div>
                <button
                  disabled={isPlanAdded(item)}
                  onClick={() => addItineraryItems([item])}
                >
                  {isPlanAdded(item) ? "已添加" : "添加到行程"}
                </button>
              </div>
            ))}
          </section>
        )}
        {expenseItems.length > 0 && (
          <section>
            <header>
              <b>可导入费用</b>
              {selectedBudget.length > 0 && (
                <button
                  onClick={() => addExpenseItems(selectedBudget, "budget")}
                >
                  加入预算 {selectedBudget.length} 项
                </button>
              )}
              {selectedLedger.length > 0 && (
                <button
                  onClick={() => addExpenseItems(selectedLedger, "ledger")}
                >
                  记入账本 {selectedLedger.length} 项
                </button>
              )}
            </header>
            {expenseItems.map((item) => {
              const destination =
                item.occurrence === "actual" ? "ledger" : "budget";
              const added = isExpenseAdded(item, destination);
              return (
                <div className="import-row" key={item.id}>
                  <input
                    aria-label={`选择${item.title}`}
                    type="checkbox"
                    checked={Boolean(
                      selectedImports[`${destination}-${item.id}`],
                    )}
                    onChange={() => toggleImport(`${destination}-${item.id}`)}
                    disabled={added}
                  />
                  <div>
                    <strong>
                      {item.title} · ¥ {item.amount}
                    </strong>
                    <small>
                      {item.occurrence === "actual"
                        ? "已发生消费"
                        : "预计费用 / 预算"}
                      {item.relatedItineraryTitle
                        ? ` · 关联 ${item.relatedItineraryTitle}`
                        : ""}
                    </small>
                  </div>
                  <button
                    disabled={added}
                    onClick={() => addExpenseItems([item], destination)}
                  >
                    {added
                      ? "已添加"
                      : item.occurrence === "actual"
                        ? "记入账本"
                        : "加入预算"}
                  </button>
                </div>
              );
            })}
          </section>
        )}
      </div>
    );
  };

  return (
    <main>
      <style>{`.wide-ai .chat .history-control .chat-history{position:absolute!important;z-index:12!important;left:auto!important;right:16px!important;top:66px!important;bottom:auto!important;width:270px!important;height:auto!important;max-height:none!important;display:block!important;overflow:hidden!important;transform:none!important}.wide-ai .chat .history-control .chat-history .history-list{max-height:180px!important;overflow-y:auto!important;scrollbar-width:thin;scrollbar-color:#c8d8cd transparent}.wide-ai .chat .history-control .chat-history .history-list::-webkit-scrollbar{width:4px}.wide-ai .chat .history-control .chat-history .history-list::-webkit-scrollbar-thumb{background:#c8d8cd;border-radius:4px}.wide-ai .chat .history-control .chat-history .history-row{display:flex!important;width:100%!important;height:34px!important;margin:2px 0!important;background:transparent!important;border-radius:5px!important;transition:background .16s ease}.wide-ai .chat .history-control .chat-history .history-row:not(.current):hover{background:#f3f7f3!important}.wide-ai .chat .history-control .chat-history .history-row.current{background:#dbece1!important;box-shadow:inset 3px 0 #5a9a70}.wide-ai .chat .history-control .chat-history .history-open{width:auto!important;min-width:0!important;flex:1!important;gap:6px!important;padding:4px 7px 4px 10px!important;background:transparent!important;color:#7f9389!important}.wide-ai .chat .history-control .chat-history .history-row.current .history-open{color:#285744!important;font-weight:600}.wide-ai .chat .history-control .chat-history .history-open b{min-width:0!important;flex:1!important}.wide-ai .chat .history-control .chat-history .history-open small{flex:none!important;color:#a5b2aa!important}.wide-ai .chat .history-control .chat-history .history-row.current .history-open small{color:#6d897b!important}.wide-ai .chat .history-control .chat-history .history-delete{width:28px!important;flex:none!important;padding:3px 6px!important;background:transparent!important;color:#b1bdb6!important}.wide-ai .chat .history-control .chat-history .history-delete:hover{color:#d96e40!important;background:#fff7f2!important}.wide-ai .chat.history-visible .chat-scroll{padding-bottom:18px!important}.wide-ai .chat.history-visible .chat-scroll .bubble{max-width:82%!important}.wide-ai .chat.history-visible .chat-scroll .user-bubble{margin-left:auto!important;border-radius:13px 4px 13px 13px}@media(max-width:760px){.wide-ai .chat .history-control .chat-history{right:0!important;top:36px!important;width:236px!important;transform:none!important}.wide-ai .chat .history-control .chat-history .history-open{padding-right:5px!important;gap:4px!important}}`}</style>
      <aside className="quick-nav" aria-label="快速导航">
        <span className="nav-handle">
          ☰<small>导航</small>
        </span>
        <a href="#top" onClick={(e) => jumpTo(e, "#top")} title="首页">
          <b>⌂</b>
          <span>首页</span>
        </a>
        <a
          href="#service"
          onClick={(e) => jumpTo(e, "#service")}
          title="出行查询"
        >
          <b>⌁</b>
          <span>查询</span>
        </a>
        <a href="#plan" onClick={(e) => jumpTo(e, "#plan")} title="旅行灵感">
          <b>✦</b>
          <span>灵感</span>
        </a>
        <a
          href="#workspace"
          onClick={(e) => jumpTo(e, "#workspace")}
          title="我的行程"
        >
          <b>✎</b>
          <span>行程</span>
        </a>
        <a href="#ai" onClick={(e) => jumpTo(e, "#ai")} title="AI 旅行助手">
          <b>✧</b>
          <span>AI 助手</span>
        </a>
        <a
          href="#top"
          onClick={(e) => jumpTo(e, "#top")}
          className="to-top"
          title="回到顶部"
        >
          <b>↑</b>
        </a>
      </aside>
      <nav className="nav shell">
        <Link className="brand" href="/" title="返回首页">
          <span>✦</span>途遇
        </Link>
        <div className="nav-links">
          <a href="#service" onClick={(e) => jumpTo(e, "#service")}>
            出行服务
          </a>
          <a href="#plan" onClick={(e) => jumpTo(e, "#plan")}>
            旅行灵感
          </a>
          <a href="#workspace" onClick={(e) => jumpTo(e, "#workspace")}>
            我的行程
          </a>
          <a href="#ai" onClick={(e) => jumpTo(e, "#ai")}>
            AI 旅行助手
          </a>
        </div>
        <button className="login">登录 / 注册</button>
      </nav>

      <section className="hero" id="top">
        <div className="shell hero-inner">
          <p className="eyebrow">TRAVEL WITH PURPOSE</p>
          <h1>
            去想去的地方，
            <br />
            <em>遇见更大的世界。</em>
          </h1>
          <p className="hero-copy">
            从出发到抵达，从灵感到回忆。
            <br />
            把每一次旅行，都变成值得珍藏的故事。
          </p>
          <div className="hero-tags">
            <span>山野</span>
            <span>城市漫游</span>
            <span>海岛假期</span>
          </div>
        </div>
        <div className="sun" />
        <div className="mountain m1" />
        <div className="mountain m2" />
        <div className="mountain m3" />
      </section>

      <section className="booking shell" id="service">
        <div className="tabs">
          {services.map((item, i) => (
            <button
              key={item.name}
              className={active === i ? "active" : ""}
              onClick={() => {
                setActive(i);
                setNotice("");
              }}
            >
              <b>{item.icon}</b>
              {item.name}
            </button>
          ))}
        </div>
        <div className="booking-body">
          <div className="city-field">
            <label htmlFor="departure-city">出发地</label>
            <input
              id="departure-city"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <button
            className="swap"
            onClick={() => {
              const temp = from;
              setFrom(to);
              setTo(temp);
            }}
          >
            ⇄
          </button>
          <div className="city-field">
            <label htmlFor="arrival-city">目的地</label>
            <input
              id="arrival-city"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="date-field">
            <span className="field-label">出发日期</span>
            <strong>
              8月 16日 <small>周六</small>
            </strong>
          </div>
          <div className="date-field">
            <span className="field-label">返程日期</span>
            <strong>
              8月 18日 <small>周一</small>
            </strong>
          </div>
          <button className="search" onClick={search}>
            查询{service.name}
          </button>
        </div>
        {notice && <p className="notice">{notice}</p>}
      </section>

      <section className="shell section" id="plan">
        <div className="section-head">
          <div>
            <p className="eyebrow">PLAN YOUR JOURNEY</p>
            <h2>出发前，先看看世界</h2>
          </div>
          <a href="#ai">探索更多 →</a>
        </div>
        <div className="cards">
          <article className="feature-card sea">
            <div className="card-text">
              <span>周末轻逃离</span>
              <h3>
                海风吹过的
                <br />
                慢时光
              </h3>
              <p>去舟山，看一场橘子海日落</p>
            </div>
          </article>
          <article className="feature-card city">
            <div className="card-text">
              <span>城市新发现</span>
              <h3>
                杭州，
                <br />
                不止西湖
              </h3>
              <p>走进巷弄里的咖啡与烟火</p>
            </div>
          </article>
          <article className="feature-card forest">
            <div className="card-text">
              <span>自然充电站</span>
              <h3>
                把自己
                <br />
                还给山野
              </h3>
              <p>莫干山两日徒步指南</p>
            </div>
          </article>
        </div>
      </section>

      <section
        className="workspace"
        id="workspace"
        style={{ paddingBottom: 40, paddingTop: 40 }}
      >
        <div className="shell">
          <div className="workspace-title">
            <div>
              <p className="eyebrow">YOUR TRIP SPACE</p>
              <h2>把旅程，一起写下来。</h2>
              <p>攻略、开销和美好瞬间，都在同一个行程里。</p>
            </div>
            <button className="share" onClick={copyInviteLink}>
              {shared ? "✓ 邀请链接已复制" : "＋ 邀请同行人"}
            </button>
          </div>
          {shared && (
            <p className="share-note" role="status">
              {shareStatus === "failed"
                ? "未能自动复制链接，请允许浏览器访问剪贴板后重试。"
                : "邀请链接已复制。同行人加入后，可以共同编辑攻略和账本。"}
            </p>
          )}
          <div className="trip-head">
            <button
              className="trip-cover"
              type="button"
              aria-label="更换行程封面图片"
              title="更换封面图片"
              onClick={() => coverInputRef.current?.click()}
              style={
                tripDetails.coverImage
                  ? {
                      backgroundImage: `linear-gradient(#183a3233, #183a3233), url(${tripDetails.coverImage})`,
                      backgroundPosition: "center",
                      backgroundSize: "cover",
                      border: 0,
                      cursor: "pointer",
                    }
                  : { border: 0, cursor: "pointer" }
              }
            >
              {!tripDetails.coverImage && (
                <span
                  style={{
                    alignSelf: "stretch",
                    fontSize: 12,
                    margin: "auto 0",
                    textAlign: "center",
                  }}
                >
                  {getDestinationPinyin(tripDetails.title)}
                </span>
              )}
            </button>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={chooseCoverImage}
            />
            <div className="trip-meta">
              <div
                className="trip-meta-controls"
                ref={tripPopover === "status" ? tripPopoverRef : null}
              >
                <button
                  type="button"
                  className="status-trigger inline-readable"
                  aria-label="修改行程状态"
                  aria-expanded={tripPopover === "status"}
                  onClick={() =>
                    setTripPopover((current) =>
                      current === "status" ? null : "status",
                    )
                  }
                  style={{
                    ...statusTagColors[tripDetails.status],
                  }}
                >
                  {tripDetails.status}
                  <span aria-hidden="true">✎</span>
                </button>
                {tripPopover === "status" && (
                  <div className="trip-popover status-popover">
                    {(["筹备中", "进行中", "已结束"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          updateTripDetails({ status });
                          setTripPopover(null);
                        }}
                      >
                        <i style={statusTagColors[status]} />
                        {status}
                      </button>
                    ))}
                  </div>
                )}
                {saveStatus !== "idle" && (
                  <small className="save-status" role="status">
                    {saveStatus === "saving" ? "正在保存…" : "已保存"}
                  </small>
                )}
              </div>
              {inlineTripTitle !== null ? (
                <input
                  className="inline-title-input"
                  ref={inlineEditorRef}
                  value={inlineTripTitle}
                  aria-label="行程名称"
                  onChange={(event) => setInlineTripTitle(event.target.value)}
                  onBlur={saveInlineTripTitle}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveInlineTripTitle();
                    if (event.key === "Escape") setInlineTripTitle(null);
                  }}
                />
              ) : (
                <h3 className="trip-title"><button type="button" className="inline-readable" title="点击编辑行程名称" onClick={() => setInlineTripTitle(tripDetails.title)}>{tripDetails.title}<span aria-hidden="true">✎</span></button></h3>
              )}
              <div
                className="trip-date-row"
                ref={tripPopover === "dates" ? tripPopoverRef : null}
              >
                <button
                  type="button"
                  className="inline-readable date-trigger"
                  aria-expanded={tripPopover === "dates"}
                  onClick={() =>
                    setTripPopover((current) =>
                      current === "dates" ? null : "dates",
                    )
                  }
                >
                  {tripDetails.startDate.replaceAll("-", ".")} - {tripDetails.endDate.replaceAll("-", ".")}
                  <span aria-hidden="true">✎</span>
                </button>
                <span>· {tripDetails.companions.length} 位同行人</span>
                {tripPopover === "dates" && (
                  <div className="trip-popover date-popover">
                    <label>出发<input type="date" value={tripDetails.startDate} onChange={(event) => updateTripDetails({ startDate: event.target.value, endDate: event.target.value > tripDetails.endDate ? event.target.value : tripDetails.endDate })} /></label>
                    <label>返程<input type="date" min={tripDetails.startDate} value={tripDetails.endDate} onChange={(event) => updateTripDetails({ endDate: event.target.value })} /></label>
                  </div>
                )}
              <div
                className="avatars member-control"
                ref={tripPopover === "members" ? tripPopoverRef : null}
              >
                <button
                  className="avatar-group-trigger"
                  type="button"
                  aria-label="管理同行人"
                  aria-expanded={tripPopover === "members"}
                  onClick={() =>
                    setTripPopover((current) =>
                      current === "members" ? null : "members",
                    )
                  }
                >
                  {tripDetails.companions.slice(0, 6).map((companion) => (
                    <i key={companion}>{companion.slice(0, 1)}</i>
                  ))}
                  <em
                    className={
                      tripDetails.companions.length > 6
                        ? "more-members"
                        : undefined
                    }
                  >
                    {tripDetails.companions.length > 6
                      ? `+${tripDetails.companions.length - 6}`
                      : "+"}
                  </em>
                </button>
                {tripPopover === "members" && (
                  <div className="trip-popover member-popover">
                    <b>同行人</b>
                    {tripDetails.companions.map((companion) => (
                      <div className="member-row" key={companion}>
                        <span>{companion}</span>
                        {companion === "你" ? <small>所有者</small> : (
                          <div
                            className="member-role-control"
                            ref={editingMemberRole === companion ? memberRoleRef : null}
                          >
                            <button
                              className="member-role-label"
                              type="button"
                              title="点击修改权限"
                              aria-expanded={editingMemberRole === companion}
                              onClick={() => setEditingMemberRole(companion)}
                            >
                              {tripDetails.memberRoles?.[companion] || "编辑者"}
                              <span aria-hidden="true">⌄</span>
                            </button>
                            {editingMemberRole === companion && (
                              <div className="member-role-menu" role="menu">
                                {(["编辑者", "查看者"] as const).map((role) => (
                                  <button
                                    key={role}
                                    type="button"
                                    role="menuitem"
                                    className={(tripDetails.memberRoles?.[companion] || "编辑者") === role ? "selected" : ""}
                                    onClick={() => {
                                      updateTripDetails({ memberRoles: { ...tripDetails.memberRoles, [companion]: role } });
                                      setEditingMemberRole(null);
                                    }}
                                  >
                                    {role}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {companion !== "你" && <button type="button" aria-label={`移除${companion}`} onClick={() => updateTripDetails({ companions: tripDetails.companions.filter((name) => name !== companion) })}>×</button>}
                      </div>
                    ))}
                    <form onSubmit={(event) => { event.preventDefault(); const name = newMember.trim(); if (name && !tripDetails.companions.includes(name)) updateTripDetails({ companions: [...tripDetails.companions, name] }); setNewMember(""); }}>
                      <input value={newMember} onChange={(event) => setNewMember(event.target.value)} placeholder="添加同行人" />
                      <button type="submit">添加</button>
                    </form>
                  </div>
                )}
              </div>
              </div>
            </div>
            <div
              className="trip-actions"
              ref={tripPopover === "settings" ? tripPopoverRef : null}
            >
              <button
                className="settings-trigger"
                type="button"
                onClick={() =>
                  setTripPopover((current) =>
                    current === "settings" ? null : "settings",
                  )
                }
              >
                设置
              </button>
              {tripPopover === "settings" && <div className="trip-popover settings-popover"><button onClick={() => coverInputRef.current?.click()}>更换封面</button><button onClick={copyInviteLink}>复制分享链接</button><button onClick={() => window.print()}>导出 PDF</button><button onClick={() => setTripPopover("members")}>权限管理</button><button>归档旅程</button><button className="danger">删除旅程</button></div>}
              <button
                className={workspaceTab === "plan" ? "selected" : ""}
                onClick={() => setWorkspaceTab("plan")}
              >
                攻略
              </button>
              <button
                className={workspaceTab === "budget" ? "selected" : ""}
                onClick={() => setWorkspaceTab("budget")}
              >
                账本 & 预算
              </button>
            </div>
          </div>
          {workspaceTab === "plan" ? (
            <div className="plan-board" style={{ height: 600 }}>
              <aside>
                <b>行程安排</b>
                {tripDays.map((item) => (
                  <button
                    key={item.day}
                    className={activeDay === item.day ? "active-day" : ""}
                    onClick={() => setActiveDay(item.day)}
                    style={{ fontSize: 11 }}
                  >
                    DAY {item.day}{" "}
                    <span style={{ color: "#597568", fontSize: 12 }}>
                      {item.date}
                    </span>
                  </button>
                ))}
              </aside>
              <div className="timeline">
                <div className="timeline-head">
                  <b>DAY {activeDay}</b>
                  <button
                    style={{ fontSize: 12, padding: "6px 10px" }}
                    onClick={() => {
                      setQuestion(`请优化杭州 DAY ${activeDay} 的路线`);
                      document
                        .querySelector("#ai")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    ✦ 让 AI 优化路线
                  </button>
                </div>
                <div className="timeline-list" ref={timelineListRef}>
                  {plans
                    .filter((plan) => (plan.day || 1) === activeDay)
                    .map((plan, index) => {
                      const style = typeColors[plan.type];
                      const displayTime =
                        plan.time ||
                        ["09:30", "11:30", "14:30"][index] ||
                        "待定";
                      return (
                        <article
                          className="itinerary-card"
                          key={plan.id}
                          data-plan-id={plan.id}
                          style={
                            {
                              "--type-color": style.color,
                              "--type-tint": style.tint,
                              zIndex: openPlanMenuId === plan.id ? 2 : 1,
                            } as React.CSSProperties
                          }
                        >
                          <time
                            style={{ fontSize: displayTime === "待定" ? 9 : 12 }}
                          >
                            {displayTime}
                          </time>
                          <span className="type-tag" style={{ fontSize: 12 }}>
                            {plan.type}
                          </span>
                          <div className="plan-content">
                            {inlinePlanEdit?.id === plan.id && inlinePlanEdit.field === "title" ? (
                              <input
                                className="inline-plan-input"
                                ref={inlineEditorRef}
                                value={inlinePlanEdit.value}
                                aria-label="行程名称"
                                onChange={(event) => setInlinePlanEdit({ ...inlinePlanEdit, value: event.target.value })}
                                onBlur={saveInlinePlan}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") saveInlinePlan();
                                  if (event.key === "Escape") setInlinePlanEdit(null);
                                }}
                              />
                            ) : (
                              <h4><button type="button" className="inline-readable" title="点击编辑行程名称" onClick={() => setInlinePlanEdit({ id: plan.id, field: "title", value: plan.title })}>{plan.title}<span aria-hidden="true">✎</span></button></h4>
                            )}
                            {inlinePlanEdit?.id === plan.id && inlinePlanEdit.field === "note" ? (
                              <textarea
                                className="inline-plan-note"
                                ref={inlineEditorRef}
                                rows={2}
                                value={inlinePlanEdit.value}
                                aria-label="行程备注"
                                placeholder="添加备注"
                                onChange={(event) => setInlinePlanEdit({ ...inlinePlanEdit, value: event.target.value })}
                                onBlur={saveInlinePlan}
                                onKeyDown={(event) => {
                                  if (event.key === "Escape") setInlinePlanEdit(null);
                                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") saveInlinePlan();
                                }}
                              />
                            ) : (
                              <p><button type="button" className="inline-readable" title="点击编辑备注" onClick={() => setInlinePlanEdit({ id: plan.id, field: "note", value: plan.note || "" })}>{plan.note || "暂无备注"}<span aria-hidden="true">✎</span></button></p>
                            )}
                          </div>
                          <small className="plan-creator">
                            {plan.creator === "AI"
                              ? "AI 规划"
                              : `${plan.creator || "你"} 添加`}
                          </small>
                          <div
                            ref={
                              openPlanMenuId === plan.id ? planMenuRef : null
                            }
                            className={`plan-menu${
                              openPlanMenuId === plan.id ? " is-open" : ""
                            }`}
                            style={
                              openPlanMenuId === plan.id
                                ? { opacity: 1 }
                                : undefined
                            }
                          >
                            <button
                              className="plan-menu-trigger"
                              aria-label={`更多操作：${plan.title}`}
                              title="更多操作"
                              type="button"
                              onClick={() =>
                                setOpenPlanMenuId((current) =>
                                  current === plan.id ? null : plan.id,
                                )
                              }
                            >
                              ⋮
                            </button>
                            {openPlanMenuId === plan.id && (
                              <div className="plan-menu-popover">
                                <button
                                  onClick={() => {
                                    setEditingPlan({
                                      ...plan,
                                      day: plan.day || activeDay,
                                    });
                                    setOpenPlanMenuId(null);
                                  }}
                                >
                                  编辑
                                </button>
                                <button onClick={() => copyPlan(plan)}>
                                  复制行程
                                </button>
                                <button
                                  className="danger"
                                  onClick={() => {
                                    deletePlan(plan.id);
                                    setOpenPlanMenuId(null);
                                  }}
                                >
                                  删除
                                </button>
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  {!plans.some((plan) => (plan.day || 1) === activeDay) && (
                    <p className="empty-day">
                      这一天还没有安排，先添加一项行程吧。
                    </p>
                  )}
                </div>
                <div
                  style={{
                    flex: "none",
                    marginTop: "auto",
                    paddingTop: 12,
                  }}
                >
                  <div className="add-local" style={{ marginTop: 0 }}>
                    <input
                      value={newPlan}
                      onChange={(e) => setNewPlan(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addPlan()}
                      placeholder="输入想法，让 AI 帮你安排这一段行程…"
                    />
                    <button onClick={addPlan}>AI生成</button>
                  </div>
                  <div className="manual-entry" style={{ marginTop: 8 }}>
                    <button
                      className="manual-add"
                      onClick={openManualPlan}
                      style={{ fontSize: 12, padding: "8px 12px" }}
                    >
                      ＋ 手动添加行程
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="budget-board"
              style={{
                display: "flex",
                flexDirection: "column",
                height: 600,
                overflow: "hidden",
              }}
            >
              <div className="budget-summary">
                <div>
                  <span>总预算</span>
                  <strong>¥ 3,000</strong>
                  <small>3 人同行 · 人均 ¥ 1,000</small>
                </div>
                <div className="progress">
                  <p>
                    已支出 <b>¥ {total}</b>
                  </p>
                  <i>
                    <b style={{ width: `${Math.min(total / 30, 100)}%` }} />
                  </i>
                  <small>还可使用 ¥ {3000 - total}</small>
                </div>
                <button onClick={() => setShowExpense(!showExpense)}>
                  ＋ 记一笔
                </button>
              </div>
              {showExpense && (
                <div className="expense-form">
                  <input
                    placeholder="消费名称"
                    value={expenseName}
                    onChange={(e) => setExpenseName(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="金额"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                  />
                  <button onClick={addExpense}>保存</button>
                </div>
              )}
              <div
                className="budget-grid"
                style={{
                  display: "grid",
                  flex: 1,
                  gap: 16,
                  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                  minHeight: 0,
                }}
              >
                <div
                  className="expense-list"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    margin: 0,
                    minHeight: 0,
                    overflowY: "auto",
                  }}
                >
                  <b>
                    消费明细 <small>已发生</small>
                  </b>
                  {expenses.map((expense) => (
                    <article key={expense.id}>
                      <i>
                        {expense.type === "住宿"
                          ? "⌂"
                          : expense.type === "餐饮"
                            ? "♨"
                            : expense.type === "交通"
                              ? "↗"
                              : "¥"}
                      </i>
                      <div>
                        <h4>{expense.item}</h4>
                        <p>
                          {expense.type} · {expense.by} 支付
                          {expense.relatedItineraryTitle
                            ? ` · 关联 ${expense.relatedItineraryTitle}`
                            : ""}
                        </p>
                      </div>
                      <strong>¥ {expense.amount}</strong>
                    </article>
                  ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    minHeight: 0,
                  }}
                >
                  <div
                    className="expense-list planned-list"
                    style={{
                      display: "flex",
                      flex: 1,
                      flexDirection: "column",
                      margin: 0,
                      minHeight: 0,
                      overflowY: "auto",
                    }}
                  >
                    <b>
                      预计费用 <small>预算</small>
                    </b>
                    {budgetItems.length ? (
                      budgetItems.map((item) => (
                        <article key={item.id}>
                          <i>¥</i>
                          <div>
                            <h4>{item.title}</h4>
                            <p>
                              {item.type}
                              {item.relatedItineraryTitle
                                ? ` · 关联 ${item.relatedItineraryTitle}`
                                : ""}
                            </p>
                          </div>
                          <strong>¥ {item.amount}</strong>
                        </article>
                      ))
                    ) : (
                      <p className="empty-budget">
                        从 AI 回复中加入预计费用，会显示在这里。
                      </p>
                    )}
                  </div>
                  <div
                    className="budget-side"
                    style={{
                      display: "flex",
                      flex: "0 0 172px",
                      flexDirection: "column",
                      margin: 0,
                      position: "static",
                      width: "auto",
                    }}
                  >
                    <b>开销分布</b>
                    <div
                      style={{
                        alignItems: "center",
                        display: "grid",
                        flex: 1,
                        gap: 12,
                        gridTemplateColumns: "132px minmax(0, 1fr)",
                      }}
                    >
                      <div className="donut" style={{ margin: "0 auto" }}>
                        <span>
                          ¥ {total}
                          <small>已支出</small>
                        </span>
                      </div>
                      <div>
                        <p>
                          ■ 住宿 ¥ 628 <em>57%</em>
                        </p>
                        <p>
                          ■ 餐饮 ¥ 168 <em>15%</em>
                        </p>
                        <p>
                          ■ 交通 ¥ 292 <em>27%</em>
                        </p>
                      </div>
                    </div>
                    <button>查看共同结算 →</button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {editingPlan && (
            <div className="edit-plan-backdrop">
              <button
                className="edit-plan-dismiss"
                type="button"
                aria-label="关闭编辑"
                onClick={() => setEditingPlan(null)}
              />
              <form
                className="edit-plan"
                onSubmit={(event) => {
                  event.preventDefault();
                  savePlan();
                }}
              >
                <div>
                  <b>编辑行程</b>
                  <button
                    type="button"
                    aria-label="关闭编辑"
                    onClick={() => setEditingPlan(null)}
                  >
                    ×
                  </button>
                </div>
                <label>
                  行程名称
                  <input
                    value={editingPlan.title}
                    onChange={(event) =>
                      setEditingPlan({
                        ...editingPlan,
                        title: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  时间
                  <input
                    value={editingPlan.time || ""}
                    placeholder="例如 09:30"
                    onChange={(event) =>
                      setEditingPlan({
                        ...editingPlan,
                        time: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  备注
                  <input
                    value={editingPlan.note || ""}
                    placeholder="例如 提前预约"
                    onChange={(event) =>
                      setEditingPlan({
                        ...editingPlan,
                        note: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  分类
                  <select
                    value={editingPlan.type}
                    onChange={(event) =>
                      setEditingPlan({
                        ...editingPlan,
                        type: event.target.value as ItineraryItem["type"],
                      })
                    }
                  >
                    {itineraryTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <div className="edit-plan-actions">
                  <button type="button" onClick={() => setEditingPlan(null)}>
                    取消
                  </button>
                  <button type="submit">保存</button>
                </div>
              </form>
            </div>
          )}
          {manualPlan && (
            <div className="edit-plan-backdrop">
              <button
                className="edit-plan-dismiss"
                type="button"
                aria-label="关闭手动添加"
                onClick={() => setManualPlan(null)}
              />
              <form
                className="edit-plan manual-plan"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveManualPlan();
                }}
              >
                <div>
                  <b>手动添加行程</b>
                  <button
                    type="button"
                    aria-label="关闭手动添加"
                    onClick={() => setManualPlan(null)}
                  >
                    ×
                  </button>
                </div>
                <label>
                  日期
                  <select
                    value={manualPlan.day || activeDay}
                    onChange={(event) =>
                      setManualPlan({
                        ...manualPlan,
                        day: Number(event.target.value) as 1 | 2 | 3,
                      })
                    }
                  >
                    {tripDays.map((item) => (
                      <option key={item.day} value={item.day}>
                        DAY {item.day} · {item.date}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  时间
                  <input
                    value={manualPlan.time || ""}
                    placeholder="例如 09:30"
                    onChange={(event) =>
                      setManualPlan({ ...manualPlan, time: event.target.value })
                    }
                  />
                </label>
                <label>
                  行程名称
                  <input
                    value={manualPlan.title}
                    placeholder="例如 杭州东站 → 西湖"
                    onChange={(event) =>
                      setManualPlan({
                        ...manualPlan,
                        title: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  地点（可选）
                  <input
                    value={manualPlan.location || ""}
                    placeholder="例如 西湖断桥"
                    onChange={(event) =>
                      setManualPlan({
                        ...manualPlan,
                        location: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  备注（可选）
                  <input
                    value={manualPlan.note || ""}
                    placeholder="例如 提前预约"
                    onChange={(event) =>
                      setManualPlan({ ...manualPlan, note: event.target.value })
                    }
                  />
                </label>
                <label>
                  分类
                  <select
                    value={manualPlan.type}
                    onChange={(event) =>
                      setManualPlan({
                        ...manualPlan,
                        type: event.target.value as ItineraryItem["type"],
                      })
                    }
                  >
                    {itineraryTypes
                      .filter((type) => type !== "活动")
                      .map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                  </select>
                </label>
                <span
                  className="manual-type-preview"
                  style={{
                    color: typeColors[manualPlan.type].color,
                    background: typeColors[manualPlan.type].tint,
                  }}
                >
                  ● {manualPlan.type}
                </span>
                <div className="edit-plan-actions">
                  <button type="button" onClick={() => setManualPlan(null)}>
                    取消
                  </button>
                  <button type="submit">保存行程</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>

      <section className="ai-wrap" id="ai">
        <div className="wide-ai">
          <div className="ai-copy">
            <p className="eyebrow">DEEPSEEK POWERED</p>
            <h2>
              有个懂旅行的
              <br />
              <em>朋友，随时在线。</em>
            </h2>
            <p>
              问它行程、预算、美食和小众玩法。DeepSeek AI
              将陪你把每个念头变成出发的理由。
            </p>
            <div className="ai-chips">
              <button onClick={() => setQuestion("帮我规划南京三日游")}>
                南京三日游怎么安排？
              </button>
              <button onClick={() => setQuestion("两人去厦门预算多少")}>
                两人去厦门预算多少？
              </button>
            </div>
          </div>
          <div className={`chat ${historyOpen ? "history-visible" : ""}`}>
            <div className="chat-top">
              <span className="ai-dot">✦</span>
              <div>
                <b>途遇 AI</b>
                <small>由 DeepSeek 驱动</small>
              </div>
              <i>在线</i>
              <div className="history-control" ref={historyPanelRef}>
                <button
                  className="history-button"
                  onClick={() => setHistoryOpen(!historyOpen)}
                >
                  ◷ 对话
                </button>
                {historyOpen && (
                  <div className="chat-history">
                    <div className="history-tools">
                      <b>历史对话</b>
                      <button
                        onClick={exportChat}
                        disabled={!chatMessages.length}
                      >
                        ⇩ 导出当前
                      </button>
                    </div>
                    <div className="history-list">
                      {savedChats.length ? (
                        savedChats.map((chat) => (
                          <div
                            className={`history-row ${chat.id === activeChatId ? "current" : ""}`}
                            key={chat.id}
                          >
                            <button
                              className="history-open"
                              onClick={() => openChat(chat)}
                            >
                              <b>{chat.title}</b>
                              <small>
                                {new Date(chat.createdAt).toLocaleDateString(
                                  "zh-CN",
                                  { month: "numeric", day: "numeric" },
                                )}
                              </small>
                            </button>
                            <button
                              className="history-delete"
                              onClick={(e) => deleteChat(e, chat.id)}
                              title="删除这段对话"
                            >
                              ×
                            </button>
                          </div>
                        ))
                      ) : (
                        <p>还没有历史对话</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button className="new-chat" onClick={newChat}>
                ＋ 新建
              </button>
            </div>
            <div className="chat-scroll" ref={chatScrollRef}>
              {!chatMessages.length && (
                <div className="bubble assistant-bubble">
                  你好呀！下一段旅程想去哪里？我可以帮你从灵感开始规划。
                  <span>09:41</span>
                </div>
              )}
              {chatMessages.map((item, index) => (
                <div
                  key={`${item.role}-${index}`}
                  className={`bubble ${item.role === "user" ? "user-bubble" : "assistant-bubble"}`}
                >
                  {item.role === "assistant" ? (
                    <>
                      <div className="rich-message">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {item.content}
                        </ReactMarkdown>
                      </div>
                      {renderImportPanel(item)}
                    </>
                  ) : (
                    item.content
                  )}
                </div>
              ))}
              {aiBusy && (
                <div className="bubble assistant-bubble">正在思考…</div>
              )}
            </div>
            <div className="chat-input">
              <input
                placeholder="问问旅行助手…"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ask()}
              />
              <button onClick={ask}>{aiBusy ? "…" : "↑"}</button>
            </div>
          </div>
        </div>
      </section>
      <footer>
        <div className="shell">
          <a className="brand" href="#top">
            <span>✦</span>途遇
          </a>
          <p>愿每一次出发，都有美好相遇。</p>
          <small>© 2026 TUYU Travel</small>
        </div>
      </footer>
    </main>
  );
}

export default function Home() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationState,
    getServerHydrationState,
  );
  return (
    <TravelApp
      key={hydrated ? "hydrated" : "server"}
      loadPersistedState={hydrated}
    />
  );
}
