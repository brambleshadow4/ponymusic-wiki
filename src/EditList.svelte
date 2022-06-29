
<script>
	import {createEventDispatcher} from "svelte";
	import Spinner from "./Spinner.svelte";
	import Grid from "./Grid.svelte";

	let dispatch = createEventDispatcher();

	let edits = [];
	let page = [0,50]
	let loading = false;

	async function load(filters)
	{
		loading = true;
		let data = await (await fetch("/api/history?page="+page[0])).json();

		edits = data.rows;
		page = [page[0], data.pages];

		loading = false;
	}

	load();

	function openTrack(editEntry)
	{
		console.log(editEntry);
		dispatch("openTrack", editEntry.track_id);
	}

	function onPageChange(e)
	{
		if(e.detail > page[0])
		{
			page[0]++;
			page = page;
			load();
		}
		else
		{
			page[0]--;
			page = page;
			load();
		}
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

	function trackTitle(item)
	{
		if(item.track_title){
			return [item.track_title]
		}
		else {
			return ["deleted(" + item.track_id + ")"];
		}
	}

	function deletedClass(item)
	{
		if(item.track_title){
			return ""
		}
		else {
			return "deleted"
		}
	}

</script>

<div class='main frame'>

	<h1>Recent Edits</h1>

	{#if loading}
		<Spinner />
	{:else}


		<Grid 
			data={edits}
			columns={[
				{width: "200", name: "Timestamp", property: "timestamp", transform: (x) => [new Date(x).toLocaleString()]},
				{width: "200", name: "Edited by", property: "user_name"},
				{width: "200", name: "Track", transform: trackTitle, classFn: deletedClass, linkFun: openTrack}
			]}
			page={page}
			on:pagechange={onPageChange}
		/>

		<!--table>
			<tr>
				<th>Timestamp</th><th>User</th><th>Track</th>
			</tr>
			{#each edits as edit}
			<tr>
				<td>{}</td>
				<td>{edit.user_name}</td>
				{#if edit.track_title == null}
					<td><a href="#edit" class='deleted' on:click={() => openTrack(edit.track_id)}>deleted ({edit.track_id})</a></td>
				{:else}
					<td><a  href="#edit" on:click={() => openTrack(edit.track_id)}>{edit.track_title}</a></td>
				{/if}
			</tr>
			{/each}
		</table-->
	{/if}
</div>

<style>

	table,tr,td,th
	{
		border-collapse: collapse;
		border: solid 1px black;
		padding: 0px 10px;
	}

	.frame{
		height: 100%;
		display: flex;
		flex-direction: column;
		padding-left: .5in;
	}

	.no-margin{
		margin: 0;
	}

</style>

