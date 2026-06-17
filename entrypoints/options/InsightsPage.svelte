<script lang="ts">
  const EXPERIMENTS = [
    {
      interval: '400 ms',
      busy: '未测（推断 >90%）',
      soldout: '—',
      note: '默认旧值，远低于滑动窗口阈值，会触发大量 555。',
      highlight: false,
    },
    {
      interval: '2000 ms',
      busy: '9 / 20（45%）',
      soldout: '11 / 20（55%）',
      note: '间隔等于窗口大小，约一半请求因抖动落入同一窗口被限。',
      highlight: false,
    },
    {
      interval: '2100 ms',
      busy: '0 / 20（0%）',
      soldout: '20 / 20（100%）',
      note: '实测最优：略大于 2 秒窗口，100% 避免 555。',
      highlight: true,
    },
    {
      interval: '3000 ms',
      busy: '0 / 20（0%）',
      soldout: '20 / 20（100%）',
      note: '同样 0% 555，但每秒只有 0.33 请求，浪费 33% 可用窗口。',
      highlight: false,
    },
  ];

  const INSIGHTS = [
    {
      title: '智谱后端限流算法',
      detail: '滑动窗口日志 / 滑动窗口计数器（Sliding Window Log / Counter）。判定依据是「过去约 2 秒内，同一用户是否已经发出过 1 次 preview 请求」。',
    },
    {
      title: '窗口大小与阈值',
      detail: '窗口 ≈ 2 秒，阈值 = 1 次 / 用户。每 2 秒内最多只有 1 个 preview 请求能真正到达业务逻辑层。',
    },
    {
      title: '为什么 2100 ms 是最优',
      detail: '2100 ms 比窗口大 100 ms，为网络抖动（RTT 波动约 ±30–50 ms）留出安全余量，因此 100% 避开 555；而 3000 ms 虽然安全，但主动放弃了 33% 的射击窗口。',
    },
    {
      title: '555 来自哪一层',
      detail: '555 的平均 RTT（~177 ms）明显低于 soldout（~215 ms），说明 555 在 gateway / 限流层就被返回，没有走到库存查询。有效 ticket 也会触发 555。',
    },
    {
      title: '单用户物理上限',
      detail: '在合法单用户身份下，无法突破 1 请求 / 2 秒。任何试图伪造身份或多账号并发的做法都违反规则，不推荐。',
    },
  ];

  const RECOMMENDATIONS = [
    {
      title: '首选配置',
      items: [
        'Mode: Auto',
        'Burst Interval: 2100 ms',
        'Pay: ALI（默认）',
      ],
    },
    {
      title: '发射时机',
      items: [
        '第一枪没有滑动窗口包袱，100% 不会被 555，务必确保它携带最新、最可靠的 ticket。',
        'Auto 模式会基于实测 latency 提前触发，让请求在 sale time 瞬间到达服务器。',
        '不要在秒杀开始前手动点 FIRE，否则第一枪优势会被浪费。',
      ],
    },
    {
      title: '避免的错误',
      items: [
        '不要用 400 ms 或 1 s 间隔 Burst，这会把绝大多数 ticket 浪费在 555 上。',
        '不要指望多商品并发绕过限流：限流是按用户维度计算的，不同商品同时请求也会互相触发 555。',
        '库存 soldout 后不要继续疯狂发射，保留 ticket 给下一场或换商品。',
      ],
    },
  ];
</script>

<div class="page-stack">
  <section class="section-card">
    <div class="section-heading">
      <span class="accent-bar" style="background: linear-gradient(180deg, var(--violet), var(--primary)); box-shadow: 0 0 14px rgba(99,102,241,0.35);"></span>
      <h3>关键洞察</h3>
    </div>
    <p class="section-note">
      通过真实浏览器实验推断出的智谱后端限流行为，以及单用户场景下的最优发射节奏。
    </p>

    <div class="insights-panel">
      <!-- Algorithm -->
      <div class="doc-hero">
        <span class="doc-badge">ALGORITHM</span>
        <h4>后端限流：滑动窗口，2 秒 1 请求</h4>
        <p>
          实验数据表明智谱使用基于用户身份的滑动窗口限流：窗口约 2 秒，阈值 1。任何试图在 2 秒内连发两枪的行为都会触发 <code>code=555</code>，而间隔 ≥2100 ms 可以稳定绕过。
        </p>
      </div>

      <!-- Experiment table -->
      <div class="doc-hero doc-hero-secondary">
        <span class="doc-badge">EXPERIMENTS</span>
        <h4>四组间隔实验对比</h4>
        <p>所有实验均为 AUTO + BURST、同一商品、20 张有效 ticket。</p>
      </div>
      <div class="usage-table-wrap">
        <table class="usage-table">
          <thead>
            <tr>
              <th>间隔</th>
              <th>555 / 限流</th>
              <th>200 soldout</th>
              <th>结论</th>
            </tr>
          </thead>
          <tbody>
            {#each EXPERIMENTS as row}
              <tr class:highlight={row.highlight}>
                <td class="u-name">{row.interval}</td>
                <td class="u-meaning">{row.busy}</td>
                <td class="u-meaning">{row.soldout}</td>
                <td class="u-desc">{row.note}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Insights -->
      <div class="doc-hero">
        <span class="doc-badge">INSIGHTS</span>
        <h4>我们掌握了什么</h4>
      </div>
      <div class="insights-grid">
        {#each INSIGHTS as item}
          <article class="insight-card">
            <h5>{item.title}</h5>
            <p>{item.detail}</p>
          </article>
        {/each}
      </div>

      <!-- Recommendations -->
      <div class="doc-hero doc-hero-secondary">
        <span class="doc-badge">RECOMMENDATIONS</span>
        <h4>单用户最优实践</h4>
      </div>
      <div class="recommendation-list">
        {#each RECOMMENDATIONS as rec}
          <article class="recommendation-card">
            <h5>{rec.title}</h5>
            <ul>
              {#each rec.items as item}
                <li>{item}</li>
              {/each}
            </ul>
          </article>
        {/each}
      </div>

      <div class="usage-summary">
        <strong>一句话总结：</strong>在智谱 2 秒滑动窗口限流下，单用户最优节奏是 <strong>每 2100 ms 发一枪 Burst</strong>。这既能把 555 降到 0，又比 3000 ms 快 31%，是当前已知理论上限附近的最佳折中。
      </div>
    </div>
  </section>
</div>

<style>
  .page-stack { display: flex; flex-direction: column; gap: 24px; }

  .section-card {
    background: linear-gradient(135deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.24) 100%);
    border: 1px solid var(--panel-border);
    border-top-color: rgba(255,255,255,0.88);
    border-left-color: rgba(255,255,255,0.88);
    box-shadow: var(--card-shadow);
    border-radius: var(--radius-xl);
    padding: 28px 30px;
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }
  @media (prefers-color-scheme: dark) {
    .section-card {
      background: linear-gradient(135deg, rgba(30,41,59,0.78) 0%, rgba(15,23,42,0.52) 100%);
      border-top-color: rgba(255,255,255,0.12);
      border-left-color: rgba(255,255,255,0.12);
    }
  }
  .section-card::before {
    content: '';
    position: absolute;
    inset: -80px auto auto -80px;
    width: 200px; height: 200px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(16,185,129,0.09), transparent 68%);
    pointer-events: none;
  }

  .section-heading { display: flex; align-items: center; gap: 12px; margin: 0 0 8px; position: relative; z-index: 1; }
  .accent-bar { width: 6px; height: 26px; border-radius: 999px; background: var(--primary); box-shadow: 0 0 14px rgba(16,185,129,0.35); flex: 0 0 auto; }
  .section-heading h3 { margin: 0; font-size: 1.1rem; font-weight: 800; color: var(--text-strong); letter-spacing: -0.02em; }
  .section-note { margin: 0 0 24px 18px; color: var(--text-muted); font-size: 13px; line-height: 1.6; position: relative; z-index: 1; }

  .insights-panel { display: flex; flex-direction: column; gap: 20px; position: relative; z-index: 1; }

  .doc-hero { padding: 22px 24px; border-radius: 22px; border: 1px solid rgba(99,102,241,0.18); background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(16,185,129,0.08)); }
  .doc-hero-secondary { border-color: rgba(16,185,129,0.18); background: linear-gradient(135deg, rgba(16,185,129,0.12), rgba(14,165,233,0.08)); }
  .doc-badge { display: inline-flex; align-self: flex-start; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,0.58); border: 1px solid rgba(255,255,255,0.72); color: var(--violet); font-size: 10px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
  .doc-hero h4 { margin: 10px 0 8px; font-size: 1.35rem; font-weight: 800; color: var(--text-strong); letter-spacing: -0.03em; }
  .doc-hero p { margin: 0; color: var(--text-main); font-size: 14px; line-height: 1.7; }
  .doc-hero code {
    font-family: 'SF Mono', monospace;
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 6px;
    background: rgba(15,23,42,0.08);
    color: var(--text-strong);
  }

  .usage-table-wrap { overflow-x: auto; border-radius: 18px; border: 1px solid var(--panel-border-soft); background: rgba(255,255,255,0.35); }
  @media (prefers-color-scheme: dark) { .usage-table-wrap { background: rgba(15,23,42,0.35); } }
  .usage-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .usage-table th { text-align: left; padding: 12px 16px; font-weight: 800; color: var(--text-strong); background: rgba(255,255,255,0.25); border-bottom: 1px solid var(--panel-border-soft); }
  @media (prefers-color-scheme: dark) { .usage-table th { background: rgba(15,23,42,0.25); } }
  .usage-table td { padding: 12px 16px; border-bottom: 1px solid rgba(188,200,214,0.12); vertical-align: top; line-height: 1.6; color: var(--text-main); }
  .usage-table tr:last-child td { border-bottom: 0; }
  .usage-table tr.highlight { background: rgba(16,185,129,0.08); }
  .u-name { font-weight: 800; color: var(--text-strong); white-space: nowrap; font-family: 'SF Mono', monospace; font-size: 12px; }
  .u-meaning { font-weight: 700; color: var(--violet); white-space: nowrap; }
  .u-desc { color: var(--text-muted); }

  .insights-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  .insight-card {
    padding: 20px;
    border-radius: 20px;
    border: 1px solid var(--panel-border-soft);
    background: rgba(255,255,255,0.4);
    box-shadow: 0 12px 28px rgba(118,136,158,0.1);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  @media (prefers-color-scheme: dark) { .insight-card { background: rgba(15,23,42,0.42); } }
  .insight-card h5 { margin: 0; color: var(--text-strong); font-weight: 800; letter-spacing: -0.02em; font-size: 1rem; }
  .insight-card p { margin: 0; color: var(--text-muted); font-size: 13px; line-height: 1.7; }

  .recommendation-list { display: flex; flex-direction: column; gap: 14px; }
  .recommendation-card {
    display: grid;
    grid-template-columns: 160px minmax(0, 1fr);
    gap: 16px;
    padding: 18px 20px;
    border-radius: 20px;
    border: 1px solid var(--panel-border-soft);
    background: rgba(255,255,255,0.4);
    box-shadow: 0 12px 28px rgba(118,136,158,0.1);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    align-items: start;
  }
  @media (prefers-color-scheme: dark) { .recommendation-card { background: rgba(15,23,42,0.42); } }
  .recommendation-card h5 {
    margin: 0;
    color: var(--text-strong);
    font-weight: 800;
    letter-spacing: -0.02em;
    font-size: 1rem;
  }
  .recommendation-card ul {
    margin: 0;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: var(--text-muted);
    font-size: 13px;
    line-height: 1.7;
  }
  .recommendation-card li { margin: 0; }

  .usage-summary {
    padding: 18px 20px;
    border-radius: 18px;
    border: 1px solid rgba(16,185,129,0.2);
    background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(99,102,241,0.06));
    color: var(--text-main);
    font-size: 14px;
    line-height: 1.7;
  }
  .usage-summary strong { color: var(--text-strong); }

  @media (max-width: 960px) {
    .insights-grid { grid-template-columns: 1fr; }
    .recommendation-card { grid-template-columns: 1fr; }
  }
</style>
