<script>

	import Spinner from "../Spinner.svelte";
	import Tag from "../Tag.svelte";

	let tags = []
	
	async function run(){

		let response = await fetch("/api/view/tags");
		tags = await response.json();
	}
	run();


</script>

<h1>Most Common Tags</h1>

{#if tags.length == 0}
	<Spinner />
{:else}
	<div>
		{#each tags as tag}
			<Tag tag={tag} count={tag.count} />
		{/each}
	</div>
{/if}

<style>
	a {
		display: inline-block;
	}

</style>