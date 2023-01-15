<script>
	export let warnings = {
		warnings: false,
		sameHyperlink: [],
		sameTitle: [],
		unknownArtists: []
	};
	export let mergeButton=false;
	import { createEventDispatcher, onMount } from 'svelte';


	onMount(() => {

		//console.log(warnings);

	})


	const dispatch = createEventDispatcher();

</script>

{#if warnings.warnings}
	<div class="tag-warnings">
		{#if warnings.sameHyperlink.length}
			<div>This track has the same hyperlink as other tracks. Please make sure it is not a duplicate of the following:</div>
			{#each warnings.sameHyperlink as item}
				<div class='indent'>
					<a target="_blank" href={"/track/" + item.id}>{item.name}</a>
					{#if mergeButton}<button class='mini-button' on:click={()=>dispatch(("merge",item.id))}>Merge &gt;&gt;</button>{/if}
				</div>
			{/each}
		{/if}
		{#if warnings.sameTitle.length}
			<div>This track has the same title as other tracks. Please make sure it is not a duplicate of the following:</div>
			{#each warnings.sameTitle as item}
				<div class='indent'>
					<a target="_blank" href={"/track/" + item.id}>{item.name}</a>
					{#if mergeButton}<button class='mini-button' on:click={()=>dispatch(("merge",item.id))}>Merge &gt;&gt;</button>{/if}
				</div>
			{/each}
		{/if}
		{#if warnings.unknownArtists.length}
			<div>This track has an artist that is currently not in the wiki. Please make sure the name is correct:</div>
			{#each warnings.unknownArtists as item}
				<div class='indent'>{item}</div>
			{/each}
		{/if}
	</div>
{/if}

<style>

	.tag-warnings
	{
		background-color: #fff7e6;
		border: solid 1px #ffcc66;
		padding: 10px;
		margin-right: .5in;
	}

</style>