<div class='main'>

	<h1>Recent Edits</h1>

	<div><a on:click={decPage}>Prev. Page</a>•<a on:click={incPage}>Next Page</a></div>
	<table>
		<tr>
			<th>Timestamp</th><th>User</th><th>Track</th>
		</tr>
		{#each edits as edit}
		<tr>
			<td>{new Date(edit.timestamp).toISOString().substring(0,19).replace("T"," ")}</td>
			<td>{edit.user_name}</td>
			<td><a on:click={() => openTrack(edit.track_id)}>{edit.track_title}</a></td>
		</tr>
		{/each}
	</table>
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

</style>


<script>
	import {createEventDispatcher} from "svelte";


	let dispatch = createEventDispatcher();

	let edits = [];
	let page = 0;


	async function load(filters)
	{
		edits = await (await fetch("/api/history?page="+page)).json();

		console.log(edits);
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