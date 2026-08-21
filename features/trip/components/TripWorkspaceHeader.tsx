"use client";

import { useRef, useState } from "react";
import { useOutsideClick } from "../../shared/hooks/useOutsideClick";

type Props = {
  shared: boolean;
  shareStatus: "idle" | "copied" | "failed";
};

export function TripWorkspaceHeader({ shared, shareStatus }: Props) {
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const [visible, setVisible] = useState(shared);

  useOutsideClick(noticeRef, visible, () => setVisible(false));

  if (!shared || !visible) return null;

  return <p className={`share-note ${shareStatus === "copied" ? "is-success" : "is-error"}`} ref={noticeRef} role="status">{shareStatus === "copied" ? "协作邀请已复制。受邀者加入后，可共同编辑攻略和账本。" : "请先登录后再邀请协作者，或检查浏览器的剪贴板权限后重试。"}</p>;
}
