<script lang="ts">
  import type { ApiEndpoint, AuthHeaders, TestResult } from '../../../lib/api/types';
  import CollapsibleSection from './CollapsibleSection.svelte';
  import TestResultPanel from './TestResultPanel.svelte';

  let {
    endpoint,
    authHeaders,
    testResult,
    onTest,
  }: {
    endpoint: ApiEndpoint;
    authHeaders: AuthHeaders | null;
    testResult: { loading: boolean; result: TestResult | null } | undefined;
    onTest: (id: string) => void;
  } = $props();

  const canTest = $derived(!!authHeaders);
  const isLoading = $derived(testResult?.loading ?? false);

  function bodyPreview(): string {
    if (!endpoint.hasBody || !endpoint.bodyTemplate) return '';
    const keys = Object.keys(endpoint.bodyTemplate);
    return `{ ${keys.join(', ')} }`;
  }

  function formatJson(obj: unknown): string {
    if (obj === null || obj === undefined) return 'null';
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

  const headersHtml = $derived(() => {
    if (!authHeaders) return '';
    const lines = [
      `Authorization: Bearer ${authHeaders.authorization.replace('Bearer ', '').slice(0, 20)}...`,
      `Content-Type: application/json;charset=UTF-8`,
      `bigmodel-organization: ${authHeaders.bigmodelOrganization}`,
      `bigmodel-project: ${authHeaders.bigmodelProject}`,
    ];
    return lines.join('\n');
  });

  const bodyHtml = $derived(() => {
    if (!endpoint.bodyTemplate) return '';
    return highlightJson(formatJson(endpoint.bodyTemplate));
  });
</script>

<div class="endpoint-card">
  <div class="card-hd">
    <span class="method-badge" class:post={endpoint.method === 'POST'} class:get={endpoint.method === 'GET'}>
      {endpoint.method}
    </span>
    <span class="card-path">{endpoint.path}</span>
  </div>
  <p class="card-desc">{endpoint.description}</p>

  {#if endpoint.note}
    <div class="note-banner">&#9888; {endpoint.note}</div>
  {/if}

  {#if endpoint.errorCodes && endpoint.errorCodes.length > 0}
    <div class="error-codes">
      {#each endpoint.errorCodes as ec}
        <span class="ec-item"><code>{ec.code}</code> {ec.meaning}</span>
      {/each}
    </div>
  {/if}

  <CollapsibleSection label="Request Headers" preview="4 headers">
    <div class="code-block">
      <span class="jk">Authorization</span>: <span class="js">Bearer {authHeaders?.authorization.replace('Bearer ', '').slice(0, 20) ?? ''}...</span>{'\n'}<span class="jk">Content-Type</span>: <span class="js">application/json;charset=UTF-8</span>{'\n'}<span class="jk">bigmodel-organization</span>: <span class="js">{authHeaders?.bigmodelOrganization ?? ''}</span>{'\n'}<span class="jk">bigmodel-project</span>: <span class="js">{authHeaders?.bigmodelProject ?? ''}</span>
    </div>
  </CollapsibleSection>

  {#if endpoint.hasBody && endpoint.bodyTemplate}
    <CollapsibleSection label="Request Body" preview={bodyPreview()}>
      <div class="code-block">{@html bodyHtml()}</div>
    </CollapsibleSection>
  {/if}

  <button
    class="test-btn"
    disabled={!canTest || isLoading}
    onclick={() => onTest(endpoint.id)}
  >
    {#if isLoading}
      <span class="spinner"></span> Testing...
    {:else}
      &#9654; Test
    {/if}
  </button>

  {#if testResult?.result}
    <TestResultPanel result={testResult.result} />
  {/if}
</div>

<style>
  .endpoint-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    padding: 14px 16px;
    margin-bottom: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  }

  .card-hd {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .method-badge {
    font-size: 9px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    flex-shrink: 0;
  }

  .method-badge.post {
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
  }

  .method-badge.get {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
  }

  .card-path {
    font-size: 11px;
    font-weight: 600;
    color: #475569;
    font-family: 'JetBrains Mono', monospace;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-desc {
    font-size: 10px;
    color: #94a3b8;
    margin: 0 0 6px;
    line-height: 1.4;
  }

  .note-banner {
    padding: 6px 10px;
    border-radius: 8px;
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.16);
    color: #d97706;
    font-size: 9px;
    font-weight: 600;
    margin-bottom: 6px;
  }

  .error-codes {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 6px;
  }

  .ec-item {
    font-size: 8px;
    color: #94a3b8;
    background: #f8fafc;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
  }

  .ec-item code {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    color: #6366f1;
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
    overflow-x: auto;
  }

  .code-block :global(.jk) { color: #6366f1; }
  .code-block :global(.jv) { color: #10b981; }
  .code-block :global(.js) { color: #f59e0b; }

  .test-btn {
    width: 100%;
    margin-top: 8px;
    padding: 8px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #fff;
    color: #475569;
    font-family: inherit;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: all 0.15s;
  }

  .test-btn:hover:not(:disabled) {
    border-color: #6366f1;
    color: #6366f1;
    background: rgba(99, 102, 241, 0.04);
  }

  .test-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid #e2e8f0;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
