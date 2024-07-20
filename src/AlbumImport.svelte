<script>

	import AlbumImportTrack from "./AlbumImportTrack.svelte";
	import TagGroupInput from "./TagGroupInput.svelte";
	import {addTagToTrack} from "./helpers.js";
	import {onMount} from "svelte";
	import {PERM, hasPerm} from "./authClient.js";

	let album = {tags:[]}; // title
	let importProgress = "";
	let exportData = [];
	let compiled = null;
	let source = null;




	onMount(function(){

		compiled.value = "javascript:(function(){" + source.value.replace(/\n|\t/g, "") + "})()";
	});


	function parseFile(ev)
	{
		let files = ev.target.files; // FileList object 
	    let reader = new FileReader();

		reader.onload = (evt) => {
			album = JSON.parse(evt.target.result);
			album.tags = [];

			album.title = trim2(album.title);

			let i = 0;
			for(let track of album.tracks)
			{	
				if(track.tags == undefined)
					track.tags = [];
			}

			album = album;
		};
		reader.readAsText(files[0])
	}

	function trim2(s)
	{
		return s.trim().replace(/\u200B/g,"");
	}

	function setTrackData(event)
	{
		let {no, skip, track} = event.detail;


		if(skip)
			delete exportData[no];
		else
			exportData[no] = track;
	}

	async function doImport()
	{
		let num = 0;
		
		for(let i=0; i<exportData.length; i++)
		{
			importProgress = i + "/" + album.tracks.length;
			if(!exportData[i])
				continue;

			await saveSingleTrack(exportData[i]);
		}

		importProgress = "Adding album hyperlink";

		let response = await (await fetch("/api/updateProperty", {
			method: "PUT",
			headers: {"Content-Type": "text/json"},
			body: JSON.stringify({
				session: sessionStorage.session,
				type: "album",
				id: album.title,
				is_delete: false,
				property: "hyperlink",
				value: album.hyperlink,
			})
		})).json();

		importProgress = "";


		window.open("/album/" + album.title, "_blank");
	}

	async function saveSingleTrack(track)
	{
		var data = {
			id: "new",
			title: track.title,
			release_date: album.release_date,
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
var json = JSON.stringify({title: albumTitle, release_date: dateText, tracks: data, hyperlink: window.location.href},"","\t"),
blob = new Blob([json], {type: "octet/stream"});
dl.href = window.URL.createObjectURL(blob);
dl.download = "albumData.json";
dl.click();

	*/
</script>

<h1>Album Import</h1>

{#if hasPerm(PERM.UNLIMITED_EDITS)}
	<p>First, navigate to a bandcamp page, and use the album bookmarklet to download the data as a .json file</p>

	<div><input type="file" on:change={parseFile} /></div>
{:else}
	<p>New accounts are limited to 10 edits a day. Please reach out to brambleshadow4 to remove this restriction if you'd like to upload albums</p>
{/if}



{#if album.tracks}
	<div>
		<label>Release:</label> <input type="date" bind:value={album.release_date} />
	</div>
	<div>
		<label>Album Tag:</label> <input type="text" bind:value={album.title} />
	</div>
	<TagGroupInput bind:value={album.tags} />

	<div>Tracks:</div>
	{#each album.tracks as track, i}
		<AlbumImportTrack no={i} albumInfo={album} bind:value={track} on:setTrackData={setTrackData} />
	{/each}

	<div><button on:click={doImport} disabled={importProgress!=""}>Import</button> {#if importProgress}{importProgress}{/if}</div>
{:else if hasPerm(PERM.UNLIMITED_EDITS)}
	<h2 id="Import_Bandcamp_Album">Bandcamp Bookmarklet</h2>

	<p>This bookmarklet which will scrape a bandcamp page into a JSON file which can be uploaded above. </p>

	<p>Below you'll find the code to use as the URL for the album bookmarklet. <strong>It is generally unsafe to run code you don't understand from someone you don't trust</strong>. The source code is offered as well if you'd like to review it.</p>


	<div><textarea rows="5" bind:this={compiled}></textarea></div>


	<h3>Source code</h3>

	<div><textarea rows="10" bind:this={source}>{
	`let albumTitle = document.querySelector('h2.trackTitle').innerHTML.trim();
	let rows = document.querySelectorAll('.track_row_view .title');
	let data = [];
	for(let i=0; i<rows.length;i++)
	{
		let title = rows[i].querySelector(".track-title").innerHTML;
		title = title.replace(/&amp;/g, "&");
		let link = rows[i].querySelector("a").href;
		if(link.startsWith("/"))
			link = location.origin + link;
		data.push({url: link, title});
	}
	let dateText = document.querySelector(".tralbumData.tralbum-credits").innerHTML;
	dateText = /released (\\w+ \\d+, \\d\\d\\d\\d)/.exec(dateText);
	if(dateText){
		let d = new Date(dateText[1]);
		if (d.toISOString().substring(10) != "T00:00:00.000Z") {
			d = new Date(d.getTime() - d.getTimezoneOffset()*1000*60);
		}
		dateText = d.toISOString().substring(0,10);
	}
	var dl = document.createElement("a");
	document.body.appendChild(dl);
	var json = JSON.stringify({
		title: albumTitle, 
		release_date: dateText,
		tracks: data, 
		hyperlink: window.location.href
	},"","\\t");
	var blob = new Blob([json], {type: "octet/stream"});
	dl.href = window.URL.createObjectURL(blob);
	dl.download = "albumData.json";
	dl.click();
	`
	}</textarea></div>
{/if}

<style>
	label {
		width:1in;
	}
	input, label {
		display:inline-block;
	}
	textarea{
		width: 100%;
	}

	p, ol, ul{
		margin-top: 0px;
	}

</style>

