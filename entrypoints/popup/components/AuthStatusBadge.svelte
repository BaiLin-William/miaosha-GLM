<script lang="ts">
  import type { AuthHeaders } from '../../../lib/api/types';

  let { authHeaders }: { authHeaders: AuthHeaders | null } = $props();

  const ready = $derived(!!authHeaders);
</script>

<div class="auth-badge" class:ready>
  <span class="auth-dot"></span>
  {#if ready}
    <span class="auth-text">Auth Ready</span>
    <span class="auth-id">{authHeaders!.bigmodelOrganization.slice(0, 12)}...</span>
  {:else}
    <span class="auth-text">No Auth — visit bigmodel.cn first</span>
  {/if}
</div>

<style>
  .auth-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    margin: 0 12px 8px;
    border-radius: 8px;
    font-size: 9px;
    font-weight: 600;
    background: rgba(244, 63, 94, 0.08);
    border: 1px solid rgba(244, 63, 94, 0.16);
    color: #f43f5e;
  }

  .auth-badge.ready {
    background: rgba(16, 185, 129, 0.08);
    border-color: rgba(16, 185, 129, 0.16);
    color: #10b981;
  }

  .auth-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #f43f5e;
    flex-shrink: 0;
  }

  .ready .auth-dot {
    background: #10b981;
    box-shadow: 0 0 6px rgba(16, 185, 129, 0.4);
  }

  .auth-text {
    flex: 1;
  }

  .auth-id {
    font-family: 'JetBrains Mono', monospace;
    opacity: 0.7;
  }
</style>
