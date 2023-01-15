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

	/*
let albumTitle = document.querySelector('h2.trackTitle').innerHTML.trim();

let rows = document.querySelectorAll('.track_row_view .title');
let data = [];

for(let i=0; i<rows.length; i++)
{
	let title = rows[i].querySelector(".track-title").innerHTML;
	title = title.replace(/&amp;/g, "&");
	let link = rows[i].querySelector("a").href;
	if(link.startsWith("/"))
		link = location.origin + link;
	data.push({url: link, title});
}
let dateText = document.querySelector(".tralbumData.tralbum-credits").innerHTML;

dateText = /released (\w+ \d+, \d\d\d\d)/.exec(dateText);
if(dateText)
	dateText = new Date(dateText[1]).toISOString().substring(0,10);

var dl = document.createElement("a");
document.body.appendChild(dl);
var json = JSON.stringify({album: albumTitle, date: dateText, tracks: data},"","\t"),
blob = new Blob([json], {type: "octet/stream"});
dl.href = window.URL.createObjectURL(blob);
dl.download = "albumData.json";
dl.click();

	*/
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

