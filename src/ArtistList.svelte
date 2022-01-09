<script>

	var dataLoaded = false;
	var data = undefined;

	async function loadData()
	{
		data = await (await fetch("/api/view/artists", {
			method: "POST",
			headers: {"Content-Type": "text/json"},
			body: JSON.stringify(data)
		})).json();

		dataLoaded = true;
	}

	loadData();

</script>

<style>
	tr, table, td 
	{
		border-collapse: collapse;
	}

	table
	{
		border: solid 1px black;
	}

	tr {
		border-bottom: solid 1px black;
	}
</style>


<table>
	<tr>
		<th>Artist</th><th>Latest Release</th><th>Date</th>
	</tr>

	{#if dataLoaded}

	{#each data as row}
		<tr>
			<td><a href="/artist/{row.id}">{row.name}</a></td>
			<td></td>
			<td></td>
		</tr>
	{/each}
	{/if}
</table>