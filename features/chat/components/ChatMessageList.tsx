import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "../model";

type Props = {
  busy: boolean;
  messages: ChatMessage[];
  renderImports: (message: ChatMessage) => React.ReactNode;
};

export function ChatMessageList({ busy, messages, renderImports }: Props) {
  return (
    <>
      {!messages.length && <div className="bubble assistant-bubble">你好呀！下一段旅程想去哪里？我可以帮你从灵感开始规划。<span>09:41</span></div>}
      {messages.map((message, index) => (
        <div key={`${message.role}-${index}`} className={`bubble ${message.role === "user" ? "user-bubble" : "assistant-bubble"}`}>
          {message.role === "assistant" ? <><div className="rich-message"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown></div>{renderImports(message)}</> : message.content}
        </div>
      ))}
      {busy && <div className="bubble assistant-bubble">正在思考…</div>}
    </>
  );
}
