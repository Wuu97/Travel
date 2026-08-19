import { useState } from "react";
import { travelServices } from "../data";

export function useTravelSearch() {
  const [active, setActive] = useState(0);
  const [from, setFrom] = useState("上海");
  const [to, setTo] = useState("杭州");
  const [notice, setNotice] = useState("");

  const search = () =>
    setNotice(`正在为你查找 ${from} → ${to} 的${travelServices[active].name}…`);

  return { active, from, notice, search, setActive, setFrom, setNotice, setTo, to };
}
