<script>

	import AlbumImportTrack from "./AlbumImportTrack.svelte";
	import TagGroupInput from "./TagGroupInput.svelte";
	import {addTagToTrack} from "./helpers.js";
	let album = {}; // title
	let albumTags = [];
	let releaseDate = "";
	let importProgress = "";

	function parseFile(ev)
	{
		let files = ev.target.files; // FileList object 
	    let reader = new FileReader();

		reader.onload = (evt) => {
			let albumData = JSON.parse(evt.target.result);

			releaseDate = albumData.release_date;

			let i = 0;
			for(let track of albumData.tracks)
			{	
				if(track.tags == undefined)
					track.tags = [];

				i++;
				for(let tag of albumTags)
				{
					let tagCopy = JSON.parse(JSON.stringify(tag));
					if(tagCopy.number)
					{
						tagCopy.number = i;
					}

					addTagToTrack(track, tagCopy);
				}
			}

			album = albumData;

		   //console.log(evt.target.result);
		};
		reader.readAsText(files[0])
	}

	async function doImport()
	{
		let num = 0;
		
		for(let track of album.tracks)
		{
			importProgress = num + "/" + album.tracks.length;
			num++;
			if(track.skip)
				continue;

			await saveSingleTrack(track);
		}

		importProgress = "";

		let albumName = album.tracks[0].tags.filter(x => x.property == "album")[0].value;
		window.open("/album/" + albumName, "_blank");
	}

	async function saveSingleTrack(track)
	{
		var data = {
			id: "new",
			title: track.title,
			release_date: releaseDate,
			tags: track.tags,
			session: sessionStorage.session
		}

		var response = {};

		try 
		{
			response = await (await fetch("/api/track", 
			{
				method: "POST",
				headers: {"Content-Type": "text/json"},
				body: JSON.stringify(data)
			})).json();
		}
		catch(e){};

		if(response.status != 200)
		{
			alert("Request failed: " + (response.error || ""));
			return 0;
		}

		return 1;
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
var json = JSON.stringify({album: albumTitle, release_date: dateText, tracks: data},"","\t"),
blob = new Blob([json], {type: "octet/stream"});
dl.href = window.URL.createObjectURL(blob);
dl.download = "albumData.json";
dl.click();

	*/
</script>

<h1>Album Import</h1>
<p>First, navigate to a bandcamp page, and use the album bookmarklet to download the data as a .json file</p>

<div><input type="file" on:change={parseFile} /></div>

<TagGroupInput bind:value={albumTags} />

{#if album.tracks}
	<div>
		<label>Release:</label> <input type="date" bind:value={releaseDate} />
	</div>
	<div>Tracks:</div>
	{#each album.tracks as track}
		<AlbumImportTrack bind:value={track} releaseDate={releaseDate} />
	{/each}

	<div><button on:click={doImport} disabled={importProgress!=""}>Import</button> {#if importProgress}{importProgress}{/if}</div>
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

