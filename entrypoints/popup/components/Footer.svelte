<script lang="ts">
  function openOptions() {
    chrome.runtime.openOptionsPage();
  }
</script>

<div class="footer">
  <div class="footer-actions">
    <button class="fbtn" title="Settings" onclick={openOptions}>&#9881;</button>
  </div>
  <span class="ver">v1.0.0</span>
</div>

<style>
  .footer {
    padding: 8px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid #e2e8f0;
  }

  .footer-actions {
    display: flex;
    gap: 4px;
  }

  .fbtn {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: #fff;
    color: #94a3b8;
    display: grid;
    place-items: center;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .fbtn:hover {
    border-color: #6366f1;
    color: #6366f1;
  }

  .ver {
    font-size: 9px;
    color: #94a3b8;
  }
</style>
