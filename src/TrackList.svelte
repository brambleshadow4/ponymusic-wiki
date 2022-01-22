
<script>
	
	let songs = [];
	let data = [];

	async function load()
	{
		data = await (await fetch("/api/view/tracks")).json();
		console.log(data);
	}

	load();

</script>


<h1>Tracks</h1>
<a href="/track/new">+ Add a track</a>



<table>
	<tr><th>Track</th><th>Artist</th><th>Released</th></tr>
	{#each data as song}
		<tr>
			<td>{song.title}</td>
			<td>{song.artist.replace(/\x1E/,", ")}</td>
			<td>{song.release_date.substring(0,10)}</td>
		</tr>
	{/each}
</table>

