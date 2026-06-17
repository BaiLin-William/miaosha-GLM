<script lang="ts">
  import type { TestResult } from '../../../lib/api/types';
  import CollapsibleSection from './CollapsibleSection.svelte';

  let { result }: { result: TestResult } = $props();

  function statusColor(s: number): string {
    if (s >= 200 && s < 300) return '#10b981';
    if (s >= 400 && s < 500) return '#f59e0b';
    if (s >= 500) return '#f43f5e';
    return '#94a3b8';
  }

  function formatJson(obj: unknown): string {
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj === 'string') return obj;
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }

  function highlightJson(json: string): string {
    return json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"([^"]+)":/g, '<span class="jk">"$1"</span>:')
      .replace(/: "([^"]*?)"/g, ': <span class="js">"$1"</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span class="jv">$1</span>')
      .replace(/: (true|false|null)/g, ': <span class="jv">$1</span>');
  }

  const bodyText = $derived(formatJson(result.body));
  const bodyHtml = $derived(highlightJson(bodyText));
  const headerEntries = $derived(Object.entries(result.headers));
</script>

<div class="result-panel">
  <div class="result-hd">
    <span class="status-badge" style="background: {statusColor(result.status)}20; color: {statusColor(result.status)}; border: 1px solid {statusColor(result.status)}30">
      {result.status || 'ERR'}
    </span>
    <span class="duration">{result.durationMs}ms</span>
    {#if result.error}
      <span class="error-text">{result.error}</span>
    {/if}
  </div>

  {#if headerEntries.length > 0}
    <CollapsibleSection label="Response Headers" preview="{headerEntries.length} headers">
      <div class="code-block">{#each headerEntries as [k, v], i}{#if i > 0}{'\n'}{/if}<span class="jk">{k}</span>: <span class="js">{v}</span>{/each}</div>
    </CollapsibleSection>
  {/if}

  {#if result.body !== null}
    <CollapsibleSection label="Response Body" defaultOpen={true}>
      <div class="code-block">{@html bodyHtml}</div>
    </CollapsibleSection>
  {/if}
</div>

<style>
  .result-panel {
    margin-top: 8px;
    padding: 10px 12px;
    background: rgba(15, 23, 42, 0.04);
    border: 1px solid #e2e8f0;
    border-radius: 10px;
  }

  .result-hd {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .status-badge {
    font-size: 10px;
    font-weight: 800;
    padding: 2px 8px;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
  }

  .duration {
    font-size: 9px;
    color: #94a3b8;
    font-family: 'JetBrains Mono', monospace;
  }

  .error-text {
    font-size: 9px;
    color: #f43f5e;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .code-block {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 9px;
    line-height: 1.6;
    color: #475569;
    font-family: 'JetBrains Mono', monospace;
    white-space: pre-wrap;
    overflow-wrap: break-word;
    width: 100%;
    max-height: 200px;
    overflow-y: auto;
  }

  .code-block :global(.jk) { color: #6366f1; }
  .code-block :global(.jv) { color: #10b981; }
  .code-block :global(.js) { color: #f59e0b; }
</style>
