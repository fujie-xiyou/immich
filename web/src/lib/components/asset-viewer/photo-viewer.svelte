<script lang="ts">
  import { fade } from 'svelte/transition';
  import { onDestroy, onMount } from 'svelte';
  import LoadingSpinner from '../shared-components/loading-spinner.svelte';
  import { api, AssetResponseDto } from '@api';
  import { notificationController, NotificationType } from '../shared-components/notification/notification';
  import { useZoomImageWheel } from '@zoom-image/svelte';
  import { photoZoomState } from '$lib/stores/zoom-image.store';
  import { isWebCompatibleImage } from '$lib/utils/asset-utils';

  export let asset: AssetResponseDto;
  export let element: HTMLDivElement | undefined = undefined;

  let imgElement: HTMLDivElement;
  let assetData: string;
  let abortController: AbortController;
  let hasZoomed = false;
  let copyImageToClipboard: (src: string) => Promise<Blob>;
  let canCopyImagesToClipboard: () => boolean;

  onMount(async () => {
    // Import hack :( see https://github.com/vadimkorr/svelte-carousel/issues/27#issuecomment-851022295
    // TODO: Move to regular import once the package correctly supports ESM.
    const module = await import('copy-image-clipboard');
    copyImageToClipboard = module.copyImageToClipboard;
    canCopyImagesToClipboard = module.canCopyImagesToClipboard;
  });

  onDestroy(() => {
    abortController?.abort();
  });

  const loadAssetData = async ({ loadOriginal }: { loadOriginal: boolean }) => {
    try {
      abortController?.abort();
      abortController = new AbortController();

      const { data } = await api.assetApi.serveFile(
        { id: asset.id, isThumb: false, isWeb: !loadOriginal, key: api.getKey() },
        {
          responseType: 'blob',
          signal: abortController.signal,
        },
      );

      if (!(data instanceof Blob)) {
        return;
      }

      assetData = URL.createObjectURL(data);
    } catch {
      // Do nothing
    }
  };

  const handleKeypress = async ({ metaKey, ctrlKey, key }: KeyboardEvent) => {
    if (window.getSelection()?.type === 'Range') {
      return;
    }
    if ((metaKey || ctrlKey) && key === 'c') {
      await doCopy();
    }
  };

  const doCopy = async () => {
    if (!canCopyImagesToClipboard()) {
      return;
    }

    try {
      await copyImageToClipboard(assetData);
      notificationController.show({
        type: NotificationType.Info,
        message: 'Copied image to clipboard.',
        timeout: 3000,
      });
    } catch (err) {
      console.error('Error [photo-viewer]:', err);
      notificationController.show({
        type: NotificationType.Error,
        message: 'Copying image to clipboard failed.',
      });
    }
  };

  const doZoomImage = async () => {
    setZoomImageWheelState({
      currentZoom: $zoomImageWheelState.currentZoom === 1 ? 2 : 1,
    });
  };

  const {
    createZoomImage: createZoomImageWheel,
    zoomImageState: zoomImageWheelState,
    setZoomImageState: setZoomImageWheelState,
  } = useZoomImageWheel();

  zoomImageWheelState.subscribe((state) => {
    photoZoomState.set(state);

    if (state.currentZoom > 1 && isWebCompatibleImage(asset) && !hasZoomed) {
      hasZoomed = true;
      loadAssetData({ loadOriginal: true });
    }
  });

  $: if (imgElement) {
    createZoomImageWheel(imgElement, {
      maxZoom: 10,
      wheelZoomRatio: 0.2,
    });
  }
</script>

<svelte:window on:keydown={handleKeypress} on:copyImage={doCopy} on:zoomImage={doZoomImage} />

<div
  bind:this={element}
  transition:fade={{ duration: 150 }}
  class="flex h-full select-none place-content-center place-items-center"
>
  {#await loadAssetData({ loadOriginal: false })}
    <LoadingSpinner />
  {:then}
    <div bind:this={imgElement} class="h-full w-full">
      <img
        transition:fade={{ duration: 150 }}
        src={assetData}
        alt={asset.id}
        class="h-full w-full object-contain"
        draggable="false"
      />
    </div>
  {/await}
</div>
