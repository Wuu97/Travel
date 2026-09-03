type Props = {
  busy: boolean;
  question: string;
  onAsk: () => void;
  onQuestionChange: (question: string) => void;
};

export function ChatComposer({ busy, question, onAsk, onQuestionChange }: Props) {
  return (
    <div className="chat-input">
      <input placeholder="问问旅行助手…" value={question} onChange={(event) => onQuestionChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onAsk()} />
      <IconButton aria-busy={busy} aria-label="发送消息" icon="send" size="sm" variant="ghost" onClick={onAsk} />
    </div>
  );
}
import { IconButton } from "../../shared/components/IconButton";
