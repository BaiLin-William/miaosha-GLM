<script lang="ts">
  import type { AuthHeaders, TestResult } from '../../../lib/api/types';
  import { API_CATALOG } from '../../../lib/api/catalog';
  import { authStore } from '../../../lib/api/auth-store';
  import { testEndpoint } from '../../../lib/api/client';
  import AuthStatusBadge from './AuthStatusBadge.svelte';
  import ApiEndpointCard from './ApiEndpointCard.svelte';

  let authHeaders = $state<AuthHeaders | null>(null);
  let authLoaded = $state(false);
  let activeTab = $state(API_CATALOG[0]?.id ?? '');
  let testResults = $state<Map<string, { loading: boolean; result: TestResult | null }>>(new Map());

  const activeEndpoint = $derived(API_CATALOG.find((e) => e.id === activeTab) ?? null);

  $effect(() => {
    (async () => {
      // Always capture fresh auth from the bigmodel.cn tab so we never use a stale JWT.
      // Fall back to the cached value only when no bigmodel.cn tab is open.
      const captured = await authStore.captureFromTab();
      authHeaders = captured ?? (await authStore.get());
      authLoaded = true;
    })();
  });

  async function handleTest(id: string) {
    const endpoint = API_CATALOG.find((e) => e.id === id);
    if (!endpoint || !authHeaders) return;

    testResults.set(id, { loading: true, result: null });
    testResults = new Map(testResults);

    const result = await testEndpoint(endpoint.method, endpoint.path, endpoint.bodyTemplate, authHeaders);

    testResults.set(id, { loading: false, result });
    testResults = new Map(testResults);
  }
</script>

<div class="dev-content">
  {#if authLoaded}
    <AuthStatusBadge {authHeaders} />
  {/if}

  <div class="tab-row">
    {#each API_CATALOG as endpoint (endpoint.id)}
      <button
        class="tab-chip"
        class:active={activeTab === endpoint.id}
        onclick={() => (activeTab = endpoint.id)}
      >
        {endpoint.path.split('/').pop()}
      </button>
    {/each}
  </div>

  {#if activeEndpoint}
    <ApiEndpointCard
      endpoint={activeEndpoint}
      {authHeaders}
      testResult={testResults.get(activeEndpoint.id)}
      onTest={handleTest}
    />
  {/if}
</div>

<style>
  .dev-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 12px 12px;
  }

  .dev-content::-webkit-scrollbar {
    width: 4px;
  }

  .dev-content::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.2);
    border-radius: 99px;
  }

  .tab-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 14px;
    padding-right: 12px;
  }

  .tab-chip {
    padding: 6px 12px;
    border-radius: 20px;
    border: 1px solid #e2e8f0;
    background: #fff;
    font-size: 10px;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s;
    font-family: inherit;
  }

  .tab-chip.active {
    background: #6366f1;
    color: #fff;
    border-color: #6366f1;
  }
</style>
