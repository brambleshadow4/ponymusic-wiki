<script>
	import Toggle from './Toggle.svelte';

	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	export let items = [];
	export let selected = "";

	function handleChange(item, checked){
		
		if(checked)
		{
			selected = item;
		}
		else
		{
			selected = "";
		}

		dispatch("change", selected)
	}



</script>

{#each items as item}
	<Toggle text={item} checked={item==selected} on:change={(e) => handleChange(item, e.detail.checked)}/>
{/each}