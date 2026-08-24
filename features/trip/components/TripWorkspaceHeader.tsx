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

  return <>
    <div className="workspace-title">
      <div>
        <p className="eyebrow">YOUR TRIP SPACE</p>
        <h2>把旅程，一起写下来。</h2>
        <p>攻略、开销和美好瞬间，都在同一个行程里。</p>
      </div>
    </div>
    {shared && visible && <p className={`share-note ${shareStatus === "copied" ? "is-success" : "is-error"}`} ref={noticeRef} role="status">{shareStatus === "copied" ? "协作邀请已复制。受邀者加入后，可共同编辑攻略和账本。" : "请先登录后再邀请协作者，或检查浏览器的剪贴板权限后重试。"}</p>}
  </>;
}
