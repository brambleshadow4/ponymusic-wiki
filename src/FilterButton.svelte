
<script>
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	export let filter="";

	function openFilter(id)
	{
		dispatch("openFilter", filter);
	}


</script>
<style>
	.filter{
		position: relative;
		bottom: -2px;
		cursor: pointer;
	}
</style>

<img class='filter' alt="filter button" src="./filter.svg" width="15" on:click={openFilter}>