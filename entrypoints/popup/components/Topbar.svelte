<script lang="ts">
  import { devEnvironment, type DevMode } from '../../../lib/settings/dev';

  let { mode, onmodechange }: {
    mode: DevMode;
    onmodechange: (mode: DevMode) => void;
  } = $props();
</script>

<div class="topbar">
  <div class="brand">
    <div class="brand-icon">Z</div>
    <div class="brand-text">智谱秒杀助手</div>
  </div>
  <div class="pill-toggle">
    <button
      class="pill-btn"
      class:active={mode === 'development'}
      onclick={() => onmodechange('development')}
    >DEV</button>
    <button
      class="pill-btn"
      class:active={mode === 'production'}
      onclick={() => onmodechange('production')}
    >PROD</button>
  </div>
</div>

<style>
  .topbar {
    padding: 14px 16px 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid #e2e8f0;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .brand-icon {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: linear-gradient(135deg, #6366f1, #a78bfa);
    display: grid;
    place-items: center;
    font-size: 14px;
    font-weight: 900;
    color: #fff;
  }

  .brand-text {
    font-size: 13px;
    font-weight: 800;
    color: #1e293b;
  }

  .pill-toggle {
    display: flex;
    background: #f1f5f9;
    border-radius: 10px;
    padding: 3px;
    border: 1px solid #e2e8f0;
  }

  .pill-btn {
    padding: 5px 14px;
    border-radius: 8px;
    border: 0;
    background: transparent;
    font-family: inherit;
    font-size: 10px;
    font-weight: 700;
    cursor: pointer;
    color: #94a3b8;
    transition: all 0.2s;
    letter-spacing: 0.02em;
  }

  .pill-btn.active {
    background: #6366f1;
    color: #fff;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
  }
</style>
