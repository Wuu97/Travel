type Props = {
  shared: boolean;
  shareStatus: "idle" | "copied" | "failed";
  onInvite: () => void;
};

export function TripWorkspaceHeader({ shared, shareStatus, onInvite }: Props) {
  return (
    <>
      <div className="workspace-title">
        <div>
          <p className="eyebrow">YOUR TRIP SPACE</p>
          <h2>把旅程，一起写下来。</h2>
          <p>攻略、开销和美好瞬间，都在同一个行程里。</p>
        </div>
        <button className="share" type="button" onClick={onInvite}>
          {shared ? "✓ 协作邀请已复制" : "＋ 邀请协作者"}
        </button>
      </div>
      {shared && (
        <p className="share-note" role="status">
          {shareStatus === "failed"
            ? "未能自动复制链接，请允许浏览器访问剪贴板后重试。"
            : "协作邀请已复制。受邀者加入后，可共同编辑攻略和账本。"}
        </p>
      )}
    </>
  );
}
