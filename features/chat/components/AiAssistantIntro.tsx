type Props = { setQuestion: (question: string) => void };

export function AiAssistantIntro({ setQuestion }: Props) {
  return (
    <div className="ai-copy">
      <p className="eyebrow">DEEPSEEK POWERED</p>
      <h2>有个懂旅行的<br /><em>朋友，随时在线。</em></h2>
      <p>问它行程、预算、美食和小众玩法。DeepSeek AI 将陪你把每个念头变成出发的理由。</p>
      <div className="ai-chips">
        <button onClick={() => setQuestion("帮我规划南京三日游")}>南京三日游怎么安排？</button>
        <button onClick={() => setQuestion("两人去厦门预算多少")}>两人去厦门预算多少？</button>
      </div>
    </div>
  );
}
