<script lang="ts">
  import { onMount } from 'svelte';
  import { devEnvironment, type DevMode } from '../../lib/settings/dev';
  import Topbar from './components/Topbar.svelte';
  import Footer from './components/Footer.svelte';
  import DevContent from './components/DevContent.svelte';
  import PlatformEntryGrid from './components/PlatformEntryGrid.svelte';

  let mode = $state<DevMode>('development');
  let loaded = $state(false);

  $effect(() => {
    devEnvironment.get().then((value) => {
      mode = value;
      loaded = true;
    });
  });

  onMount(() => {
    // Acknowledge a transient purchase-success badge when the user opens the popup.
    chrome.action.getBadgeText({}).then((text) => {
      if (text === 'OK') {
        chrome.action.setBadgeText({ text: '' });
        chrome.action.setTitle({ title: '' });
      }
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
      <PlatformEntryGrid />
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
    color: #0c1224;
    background: #f5f3ee;
    width: 380px;
    min-height: 520px;
    overflow: hidden;
    /* 工程蓝图网格底纹 */
    background-image:
      linear-gradient(rgba(12, 18, 36, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(12, 18, 36, 0.04) 1px, transparent 1px);
    background-size: 18px 18px;
  }

  .shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #ffffff;
  }

  .loading {
    flex: 1;
    display: grid;
    place-items: center;
  }

  .loading-spinner {
    width: 22px;
    height: 22px;
    border: 2px solid #0c1224;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
