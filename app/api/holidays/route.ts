type UpstreamHoliday = {
  date?: string;
  type?: number;
  name?: string;
  target?: string;
  is_holiday?: number;
  extra_info?: string;
};

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get("month")?.trim();
  if (!month || !MONTH_PATTERN.test(month)) return Response.json({ error: "月份参数无效。" }, { status: 400 });

  try {
    const upstream = await fetch(`https://holiday.ailcc.com/api/holiday/allyear/${month.slice(0, 4)}`, {
      headers: { Accept: "application/json" },
    });
    if (!upstream.ok) throw new Error("holiday provider unavailable");
    const payload = await upstream.json() as { code?: number; data?: UpstreamHoliday[] };
    if (payload.code !== 0 || !Array.isArray(payload.data)) throw new Error("invalid holiday payload");

    const isMarkedDay = (item: UpstreamHoliday) => {
        if (!item.date?.startsWith(`${month}-`)) return false;
        const name = item.name || "";
        return (item.is_holiday === 1 && item.type !== 1) || name.includes("班");
      };
    const targetStartDates = new Map<string, string>();
    payload.data.filter((item) => item.is_holiday === 1 && Boolean(item.target) && Boolean(item.date)).forEach((item) => {
      const target = item.target as string;
      const date = item.date as string;
      if (!targetStartDates.has(target) || date < (targetStartDates.get(target) as string)) targetStartDates.set(target, date);
    });
    const markers = Object.fromEntries(payload.data
      .filter(isMarkedDay)
      .map((item) => {
        const isRest = item.is_holiday === 1;
        return [item.date as string, isRest
          ? { kind: "rest", label: item.extra_info || (targetStartDates.get(item.target || "") === item.date ? item.target : undefined) }
          : { kind: "work" }];
      }));
    return Response.json({ markers }, { headers: { "Cache-Control": "public, max-age=21600, stale-while-revalidate=604800" } });
  } catch {
    return Response.json({ markers: {} }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
