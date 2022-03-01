<div class='main'>

	<h1>Recent Edits</h1>

	{#if loading}
		<Spinner />
	{:else}
		<div><a on:click={decPage}>Prev. Page</a>•<a on:click={incPage}>Next Page</a></div>
		<table>
			<tr>
				<th>Timestamp</th><th>User</th><th>Track</th>
			</tr>
			{#each edits as edit}
			<tr>
				<td>{new Date(edit.timestamp).toLocaleString()}</td>
				<td>{edit.user_name}</td>
				{#if edit.track_title == null}
					<td><a class='deleted' on:click={() => openTrack(edit.track_id)}>deleted ({edit.track_id})</a></td>
				{:else}
					<td><a on:click={() => openTrack(edit.track_id)}>{edit.track_title}</a></td>
				{/if}
			</tr>
			{/each}
		</table>
	{/if}
</div>

<style>
	.main
	{
		margin-left: .5in;
	}

	table,tr,td,th
	{
		border-collapse: collapse;
		border: solid 1px black;
		padding: 0px 10px;
	}

	a.deleted
	{
		color: red;
	}

</style>


<script>
	import {createEventDispatcher} from "svelte";
	import Spinner from "./Spinner.svelte";

	let dispatch = createEventDispatcher();

	let edits = [];
	let page = 0;
	let loading = false;


	async function load(filters)
	{
		loading = true;
		edits = await (await fetch("/api/history?page="+page)).json();

		loading = false;
	}

	load();

	function openTrack(id)
	{
		dispatch("openTrack", id);
	}

	function incPage()
	{
		page++;
		load();
	}

	function decPage()
	{
		page = Math.max(page-1, 0);
		load();
	}

</script>