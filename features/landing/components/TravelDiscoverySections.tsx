import type { MouseEvent } from "react";
import { InspirationSection } from "../../inspiration/components/InspirationSection";
import { QuickNavigation } from "../../navigation/components/QuickNavigation";
import { BookingSearch } from "../../search/components/BookingSearch";
import { travelServices } from "../../search/data";
import { HeroSection } from "./HeroSection";

type Props = { accountLabel?: string | null; accessToken?: string | null; active: number; from: string; notice: string; onNavigate: (event: MouseEvent<HTMLAnchorElement>, target: string) => void; onSearch: () => void; onSignOut?: () => void; setActive: (active: number) => void; setFrom: (value: string) => void; setNotice: (value: string) => void; setTo: (value: string) => void; to: string };

export function TravelDiscoverySections({ accountLabel, accessToken, active, from, notice, onNavigate, onSearch, onSignOut, setActive, setFrom, setNotice, setTo, to }: Props) {
  return <><QuickNavigation accountLabel={accountLabel} accessToken={accessToken} onNavigate={onNavigate} onSignOut={onSignOut} /><HeroSection /><BookingSearch active={active} from={from} notice={notice} onSearch={onSearch} setActive={setActive} setFrom={setFrom} setNotice={setNotice} setTo={setTo} services={travelServices} to={to} /><InspirationSection /></>;
}
