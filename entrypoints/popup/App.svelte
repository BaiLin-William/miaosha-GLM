<script lang="ts">
  import { devEnvironment, type DevMode } from '../../lib/settings/dev';
  import Topbar from './components/Topbar.svelte';
  import Footer from './components/Footer.svelte';
  import DevContent from './components/DevContent.svelte';
  import ProdContent from './components/ProdContent.svelte';

  let mode = $state<DevMode>('development');
  let loaded = $state(false);

  $effect(() => {
    devEnvironment.get().then((value) => {
      mode = value;
      loaded = true;
    });
  });

  function handleModeChange(newMode: DevMode) {
    mode = newMode;
    devEnvironment.set(newMode);
  }
</script>

<div class="shell">
  <Topbar {mode} onmodechange={handleModeChange} />

  {#if loaded}
    {#if mode === 'development'}
      <DevContent />
    {:else}
      <ProdContent />
    {/if}
  {:else}
    <div class="loading">
      <div class="loading-spinner"></div>
    </div>
  {/if}

  <Footer />
</div>

<style>
  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(body) {
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #1e293b;
    background: #f4f7fb;
    width: 380px;
    min-height: 520px;
    overflow: hidden;
    background-image:
      radial-gradient(at 20% 10%, rgba(99, 102, 241, 0.06), transparent 50%),
      radial-gradient(at 80% 90%, rgba(16, 185, 129, 0.06), transparent 50%);
  }

  .shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  .loading {
    flex: 1;
    display: grid;
    place-items: center;
  }

  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 3px solid #e2e8f0;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
