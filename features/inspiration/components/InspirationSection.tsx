export function InspirationSection() {
  return (
      <section className="shell section" id="plan">
        <div className="section-head">
          <div>
            <p className="eyebrow">PLAN YOUR JOURNEY</p>
            <h2>出发前，先看看世界</h2>
          </div>
          <a href="#ai">探索更多 →</a>
        </div>
        <div className="cards">
          <article className="feature-card sea">
            <div className="card-text">
              <span>周末轻逃离</span>
              <h3>
                海风吹过的
                <br />
                慢时光
              </h3>
              <p>去舟山，看一场橘子海日落</p>
            </div>
          </article>
          <article className="feature-card city">
            <div className="card-text">
              <span>城市新发现</span>
              <h3>
                杭州，
                <br />
                不止西湖
              </h3>
              <p>走进巷弄里的咖啡与烟火</p>
            </div>
          </article>
          <article className="feature-card forest">
            <div className="card-text">
              <span>自然充电站</span>
              <h3>
                把自己
                <br />
                还给山野
              </h3>
              <p>莫干山两日徒步指南</p>
            </div>
          </article>
        </div>
      </section>

  );
}

