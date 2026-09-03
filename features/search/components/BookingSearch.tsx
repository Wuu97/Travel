"use client";

import { IconButton } from "../../shared/components/IconButton";

type Service = { icon: string; name: string; note: string };

type BookingSearchProps = {
  active: number;
  from: string;
  notice: string;
  onSearch: () => void;
  setActive: (active: number) => void;
  setFrom: (city: string) => void;
  setNotice: (notice: string) => void;
  setTo: (city: string) => void;
  services: readonly Service[];
  to: string;
};

export function BookingSearch({ active, from, notice, onSearch, setActive, setFrom, setNotice, setTo, services, to }: BookingSearchProps) {
  const service = services[active];
  return <section className="booking shell" id="service">
    <div className="tabs">{services.map((item, index) => <button key={item.name} className={active === index ? "active" : ""} onClick={() => { setActive(index); setNotice(""); }}><b>{item.icon}</b>{item.name}</button>)}</div>
    <div className="booking-body">
      <div className="city-field"><label htmlFor="departure-city">出发地</label><input id="departure-city" value={from} onChange={(event) => setFrom(event.target.value)} /></div>
      <span className="swap"><IconButton aria-label="交换出发地和目的地" icon="swap" size="sm" variant="ghost" onClick={() => { setFrom(to); setTo(from); }} /></span>
      <div className="city-field"><label htmlFor="arrival-city">目的地</label><input id="arrival-city" value={to} onChange={(event) => setTo(event.target.value)} /></div>
      <div className="date-field"><span className="field-label">出发日期</span><strong>8月 16日 <small>周六</small></strong></div>
      <div className="date-field"><span className="field-label">返程日期</span><strong>8月 18日 <small>周一</small></strong></div>
      <button className="search" onClick={onSearch}>查询{service.name}</button>
    </div>
    {notice && <p className="notice">{notice}</p>}
  </section>;
}
