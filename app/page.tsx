import { cookies } from "next/headers";
import { authDisplayHintCookie } from "../features/auth/supabase";
import { TravelApp } from "../features/travel/components/TravelApp";

export default async function Home() {
  const initialAccountLabel = (await cookies()).get(authDisplayHintCookie)?.value || null;
  return <TravelApp initialAccountLabel={initialAccountLabel} />;
}
