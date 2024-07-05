
<script>
	import {createEventDispatcher} from "svelte";
	import Spinner from "./Spinner.svelte";
	import Grid from "./Grid.svelte";
	import ObjectDiff from "./components/ObjectDiff.svelte";

	let dispatch = createEventDispatcher();

	let edits = [];
	let page = [0,50]
	let loading = false;

	let boundTimestamp = "";



	let queryKeys = (window.location.search || "").substring(1).split("&");
	let query = {};
	for(let k in queryKeys)
	{
		let [a,b] = queryKeys[k].split("=");
		query[decodeURIComponent(a)] = decodeURIComponent(b);
	}

	if(query["timestamp"])
	{
		boundTimestamp = query["timestamp"];
	}

	async function load(filters)
	{
		loading = true;
		let data = await (await fetch("/api/history?timestamp="+boundTimestamp)).json();

		edits = data.rows;

		loading = false;
	}

	load();

	function onTimestampChange(e)
	{
		window.history.replaceState("", "", "?timestamp="+boundTimestamp)
		load();
	}

	function loadOlder()
	{
		let lastEdit = edits[edits.length-1];



		boundTimestamp = lastEdit.timestamp;


		window.history.replaceState("", "", "?timestamp="+boundTimestamp)
		load();
	}

</script>

<div class='main frame'>

	<h1>Recent Edits</h1>

	<div>
		<label>Jump to timestamp:</label> <input bind:value={boundTimestamp} type="datetime-local" id="lookback" name="lookback-time" on:change={onTimestampChange}>
	</div>

	{#if loading}
		<Spinner />
	{:else}



		{#each edits as edit}
			<ObjectDiff value={edit} on:open />
		{/each}

		<button on:click={loadOlder}>View older edits</button>

	{/if}
</div>

<style>
	.main {
		padding-left: .5in;
		overflow-y: auto;
		height: 100%;
	}
	/*.frame{
		height: 100%;
		display: flex;
		flex-direction: column;
		padding-left: .5in;
	}*/
	@media only screen and (max-width: 800px){
		.frame {padding-left: 5px}
	}

	label {
		display: inline-block;
	}

</style>

