type IconName = "calendar" | "clock" | "check" | "mountain";

type Props = { name: IconName };

export function TripSidebarIcon({ name }: Props) {
  if (name === "calendar") return <svg aria-hidden="true" viewBox="0 0 24 24"><rect height="16" rx="3" width="17" x="3.5" y="5" /><path d="M7.5 3.5v3M16.5 3.5v3M3.5 10h17M8 14h3M13 14h3M8 17h3" /></svg>;
  if (name === "clock") return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></svg>;
  if (name === "check") return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="m8.3 12.1 2.4 2.4 5-5" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m3.5 18.5 5.2-10 4.2 7 2.4-4.3 5.2 7.3H3.5Z" /></svg>;
}
