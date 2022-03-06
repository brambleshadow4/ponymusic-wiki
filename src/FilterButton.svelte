
<script>
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	export let property="";
	export let active=false;

	function openFilter(id)
	{
		dispatch("openFilter", property);
	}


</script>
<style>
	.filter{
		position: relative;
		bottom: -2px;
		cursor: pointer;
	}
</style>

{#if active}
	<img class='filter' alt="filter button" src="/filterActive.svg" width="15" on:click={openFilter}>
{:else}
	<img class='filter' alt="filter button" src="/filter.svg" width="15" on:click={openFilter}>
{/if}