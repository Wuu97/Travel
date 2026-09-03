import { useTripCapabilities } from "./TripCapabilities";
import { Button } from "../../shared/components/Button";

type Props = {
  canEditTrip?: boolean;
  idea: string;
  onAddByAi: () => void;
  onIdeaChange: (idea: string) => void;
  onManualAdd: () => void;
  onOptimize: () => void;
};

export function ItineraryEntryActions({ canEditTrip = true, idea, onAddByAi, onIdeaChange, onManualAdd, onOptimize }: Props) {
  const capabilities = useTripCapabilities();
  canEditTrip = canEditTrip && capabilities.canEditTrip;
  return (
    <div style={{ flex: "none", marginTop: "auto", paddingTop: 12 }}>
      <div className="add-local" style={{ marginTop: 0 }}>
        <input disabled={!canEditTrip} value={idea} onChange={(event) => onIdeaChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onAddByAi()} placeholder="输入想法，让 AI 帮你安排这一段行程…" />
        <Button disabled={!canEditTrip} size="md" type="button" variant="primary" onClick={onAddByAi}>AI生成</Button>
      </div>
      <div className="manual-entry" style={{ marginTop: 8 }}>
        <button disabled={!canEditTrip} className="manual-add" onClick={onManualAdd} style={{ fontSize: 12, padding: "8px 12px" }}>＋ 手动添加行程</button>
        <button disabled={!canEditTrip} className="optimize-route" onClick={onOptimize} style={{ fontSize: 12, padding: "8px 12px" }}>✦ 让 AI 优化路线</button>
      </div>
    </div>
  );
}
