<script lang="ts">
  import { version } from '../../package.json';

  interface LogItem {
    category: 'feature' | 'improvement' | 'fix' | 'cleanup';
    title: string;
    body: string;
  }

  const CATEGORIES: Record<LogItem['category'], { label: string; color: string }> = {
    feature:     { label: '新增', color: '#10b981' },
    improvement: { label: '优化', color: '#6366f1' },
    fix:         { label: '修复', color: '#f59e0b' },
    cleanup:     { label: '清理', color: '#64748b' },
  };

  const LOGS: LogItem[] = [
    {
      category: 'feature',
      title: '全新 Fire 策略：错峰首枪 + 稳定连发 + 动态换弹',
      body: '基于实测结论重构发射调度器。新增首枪时间偏移、错峰抖动窗、商品优先级 ticket 配比、错误码驱动退避（500/555 分别处理）、动态目标切换与换弹重分配，提升在智谱 2 秒滑动窗口与腾讯 1000 QPS 核销上限下的命中概率。',
    },
    {
      category: 'feature',
      title: 'Fire Matrix 策略可视化',
      body: '实时展示当前 offset、stagger、allocation 配比、当前退避间隔，并在时间线中标注目标切换、退避调整与重分配事件，方便观察调度器决策过程。',
    },
    {
      category: 'feature',
      title: '商品优先级与 Ticket 配比',
      body: 'Target Products 最多可选 3 个并按 P1/P2/P3 排序；Fire Config 支持按优先级分配 ticket 比例（默认 70/20/10），动态切换时剩余 ticket 会自动在存活商品间重新分配。',
    },
    {
      category: 'improvement',
      title: 'Alarm 提醒增强',
      body: '新增 T-10 提醒；badge 从 T-60 起持续显示，直到被下一阶段图标替换；T-5/T-10/T-15/T-30/T-60 分别对应 4/3/1/1/1 声蜂鸣；Options 页面增加声音总开关，默认开启。',
    },
    {
      category: 'fix',
      title: '秒杀默认时间显示修复',
      body: 'Options 中「重置默认」按钮现在正确显示 UTC+8 10:00:00.000，而不是被时区偏移成 18:00:00.000。',
    },
    {
      category: 'improvement',
      title: 'UI 信息分级重构',
      body: '将 overlay 信息拆分为基础信息（用户/时间/延迟）、配置区（商品与资源配比）与操作区（验证码收集与发射策略），降低认知负荷。',
    },
    {
      category: 'feature',
      title: 'Options 文档页',
      body: '新增使用说明、软件架构、关键洞察与本次更新日志四个文档页，帮助用户理解原理与最佳实践。',
    },
    {
      category: 'improvement',
      title: '首枪自动校准',
      body: 'Auto 模式根据实测 latency 计算发射时刻，并支持正负偏移与随机抖动，让第一枪尽量在秒杀瞬间到达业务层。',
    },
    {
      category: 'cleanup',
      title: '移除冗余模块与 Dev 配置',
      body: '删除已废弃的 payment-store、ticket-store、runtime-calibration、dev 配置项、batch-preview 轮询及大量调试脚本，减少包体积与维护面。',
    },
    {
      category: 'improvement',
      title: '测试覆盖',
      body: '新增 fire-plan、fire settings、background alarms 等单元测试，并在重构过程中持续更新测试期望，确保功能等价。',
    },
  ];

  const STATS = [
    { label: 'Commits since v1.0.0.alpha', value: '34+' },
    { label: '新增 Options 文档页', value: '4' },
    { label: 'Fire 策略配置项', value: '8' },
    { label: 'Alarm 阶段', value: '5' },
  ];
</script>

<div class="page-stack">
  <section class="section-card">
    <div class="section-heading">
      <span class="accent-bar" style="background: linear-gradient(180deg, var(--primary), var(--violet)); box-shadow: 0 0 14px rgba(16,185,129,0.35);"></span>
      <h3>v{version} 更新日志</h3>
    </div>
    <p class="section-note">
      自 <code>v1.0.0.alpha</code> 以来的主要改进。本次发布聚焦「策略精细化」与「体验可观测性」：从实测数据出发优化发射节奏，同时把配置、提醒与决策过程更直观地呈现给用户。
    </p>

    <div class="stats-row">
      {#each STATS as stat}
        <div class="stat-card">
          <span class="stat-value">{stat.value}</span>
          <span class="stat-label">{stat.label}</span>
        </div>
      {/each}
    </div>
  </section>

  <section class="section-card">
    <div class="section-heading">
      <span class="accent-bar" style="background: var(--amber); box-shadow: 0 0 14px rgba(245,158,11,0.35);"></span>
      <h3>变更详情</h3>
    </div>

    <ol class="log-list">
      {#each LOGS as log}
        <li class="log-item">
          <span class="log-badge" style="background: {CATEGORIES[log.category].color}20; color: {CATEGORIES[log.category].color}; border-color: {CATEGORIES[log.category].color}30;">
            {CATEGORIES[log.category].label}
          </span>
          <div class="log-content">
            <h4>{log.title}</h4>
            <p>{log.body}</p>
          </div>
        </li>
      {/each}
    </ol>
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

  .section-heading { display: flex; align-items: center; gap: 12px; margin: 0 0 8px; position: relative; z-index: 1; }
  .accent-bar { width: 6px; height: 26px; border-radius: 999px; background: var(--primary); box-shadow: 0 0 14px rgba(16,185,129,0.35); flex: 0 0 auto; }
  .section-heading h3 { margin: 0; font-size: 1.1rem; font-weight: 800; color: var(--text-strong); letter-spacing: -0.02em; }
  .section-note { margin: 0 0 24px 18px; color: var(--text-muted); font-size: 13px; line-height: 1.6; position: relative; z-index: 1; }
  .section-note code {
    font-family: 'SF Mono', Monaco, Consolas, monospace;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 6px;
    background: rgba(99,102,241,0.1);
    color: var(--violet);
  }

  .stats-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 14px;
    margin-top: 8px;
  }
  .stat-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 16px;
    border-radius: 16px;
    background: rgba(255,255,255,0.5);
    border: 1px solid var(--panel-border-soft);
  }
  @media (prefers-color-scheme: dark) {
    .stat-card { background: rgba(15,23,42,0.42); }
  }
  .stat-value { font-size: 26px; font-weight: 800; color: var(--primary-strong); }
  .stat-label { font-size: 11px; color: var(--text-muted); font-weight: 600; }

  .log-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .log-item {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    padding: 16px;
    border-radius: 16px;
    background: rgba(255,255,255,0.42);
    border: 1px solid var(--panel-border-soft);
  }
  @media (prefers-color-scheme: dark) {
    .log-item { background: rgba(15,23,42,0.32); }
  }
  .log-badge {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 800;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .log-content { display: flex; flex-direction: column; gap: 6px; }
  .log-content h4 { margin: 0; font-size: 14px; font-weight: 800; color: var(--text-strong); }
  .log-content p { margin: 0; font-size: 12px; line-height: 1.65; color: var(--text-muted); }
</style>
