type Props = {
  idea: string;
  onAddByAi: () => void;
  onIdeaChange: (idea: string) => void;
  onManualAdd: () => void;
};

export function ItineraryEntryActions({ idea, onAddByAi, onIdeaChange, onManualAdd }: Props) {
  return (
    <div style={{ flex: "none", marginTop: "auto", paddingTop: 12 }}>
      <div className="add-local" style={{ marginTop: 0 }}>
        <input value={idea} onChange={(event) => onIdeaChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onAddByAi()} placeholder="输入想法，让 AI 帮你安排这一段行程…" />
        <button onClick={onAddByAi}>AI生成</button>
      </div>
      <div className="manual-entry" style={{ marginTop: 8 }}>
        <button className="manual-add" onClick={onManualAdd} style={{ fontSize: 12, padding: "8px 12px" }}>＋ 手动添加行程</button>
      </div>
    </div>
  );
}
