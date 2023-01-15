<script>

	import AlbumImportTrack from "./AlbumImportTrack.svelte";
	let album = {}; // title

	function parseFile(ev)
	{
		let files = ev.target.files; // FileList object 
	    let reader = new FileReader();

		reader.onload = (evt) => {
			album = JSON.parse(evt.target.result);
		   // console.log(evt.target.result);
		};
		reader.readAsText(files[0])
	}
</script>

<h1>Album Import</h1>
<p>First, navigate to a bandcamp page, and use the album bookmarklet to download the data as a .json file</p>

<div><input type="file" on:change={parseFile} /></div>

{#if album.tracks}

	<div>
		<label>Album tag:</label> <input bind:value={album.title} />
	</div>
	<div>
		<label>Artist tag:</label> <input bind:value={album.artist}/>
	</div>

	<div>Tracks:</div>
	{#each album.tracks as track}
		<AlbumImportTrack bind:value={track} />
	{/each}
{:else}

{/if}

<style>
	label {
		width:1in;
	}
	input, label {
		display:inline-block;
	}

</style>

