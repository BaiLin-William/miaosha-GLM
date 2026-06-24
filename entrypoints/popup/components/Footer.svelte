<script lang="ts">
  import { version } from '../../../package.json';

  function openOptions() {
    chrome.runtime.openOptionsPage();
  }
</script>

<div class="footer">
  <div class="footer-actions">
    <button class="fbtn" title="Settings" onclick={openOptions}>⚙</button>
  </div>
  <span class="meta">v{version} · </span>
</div>

<style>
  .footer {
    flex: 0 0 auto;
    padding: 8px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #ffffff;
    border-top: 1.5px solid #0c1224;
  }

  .footer-actions {
    display: flex;
    gap: 4px;
  }

  .fbtn {
    width: 26px;
    height: 26px;
    border: 1.5px solid #0c1224;
    border-radius: 6px;
    background: #fafaf7;
    color: #0c1224;
    display: grid;
    place-items: center;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .fbtn:hover {
    background: #0c1224;
    color: #f5f3ee;
  }

  .meta {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    color: #6a7496;
    letter-spacing: 0.05em;
  }
</style>