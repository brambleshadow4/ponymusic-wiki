<h1>Import Tools</h1>
<h2>Bookmarklet</h2>
<p>The current approach is the use of a bookmarklet, which is a piece of javascript that you can add to the bookmark bar of your browser. When you click the bookmarklet, it scrapes the page for a few pieces of information, then sends it over to ponymusic.wiki where you can correct any spellings and then add it quickly.</p>

<h3>Parse Rules</h3>

<p>The youTube/bandcamp title often contains names of artists/genres of the track. This setting controls how that information is parsed</p>

<RadioGroup 
	checked={parseRule}
	options={["No Parsing", "<artist1>, <artist2> & <artist3> - Track Title (feat. <featuredArtist>)[<genre>]"]} 
	on:change={(e) => {localStorage.parseRule = e.detail}}
	/>

<h3>The Bookmarklet code</h3>

<div><textarea rows="5" bind:this={compiled}></textarea></div>

<h3>The Bandcamp Album Import Bookmarklet</h3>

<div><textarea rows="5" bind:this={compiled2}></textarea></div>


<p>It generally isn't a good idea to run code arbitrary code that you don't trust, including bookmarklets (though we kind of do it all the time). </p>

<h3>Source code</h3>
<div><textarea  rows="10" bind:this={source}>{
`url = encodeURIComponent(window.location);

if(url.indexOf("youtube.com") > -1){
	title = document.getElementsByClassName('title ytd-video-primary-info-renderer')[0].children[0].innerHTML;
	date = document.getElementById('info-strings').getElementsByTagName('yt-formatted-string')[0].innerHTML;
	artist = document.getElementsByTagName("ytd-video-owner-renderer")[0].getElementsByTagName('a')[1].innerHTML;
}

if (url.indexOf("bandcamp.com") > -1){
	title = document.getElementsByClassName('trackTitle')[0].innerHTML.trim();
	date = document.getElementsByClassName("tralbum-credits")[0].innerHTML.trim();
	artistSpanLinks = document.getElementsByClassName("albumTitle")[0].getElementsByTagName('a');
	artist = artistSpanLinks[artistSpanLinks.length-1].innerHTML;
}
if (url.indexOf("soundcloud.com") > -1) {
	title = document.getElementsByClassName('soundTitle__title')[0].getElementsByTagName('span')[0].innerHTML;
	date = document.getElementsByClassName('relativeTime')[0].dateTime.substr(0,10);
	artist = document.getElementsByClassName('soundTitle__username')[0].getElementsByTagName('a')[0].innerHTML.trim();
}

if(title){
	title = encodeURIComponent(title);
	artist = encodeURIComponent(artist);
	date = encodeURIComponent(date);
	x = window.open(\`https://ponymusic.wiki/track/new?title=\${title}&date=\${date}&artist=\${artist}&url=\${url}\`,"_blank");
}`
}</textarea></div>


<div><textarea rows="10" bind:this={source2}>{
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
dateText = /released (\w+ \d+, \d\d\d\d)/.exec(dateText);
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
},"","\t");
var blob = new Blob([json], {type: "octet/stream"});
dl.href = window.URL.createObjectURL(blob);
dl.download = "albumData.json";
dl.click();
`
}</textarea></div>

<h2>Check URLs</h2>
<p>Check if URLs are stored somewhere in the database or not. Paste each URL on its own line</p>
<table>
	<tr>
		<th>Enter URLs</th>
		<th>In database</th>
		<th>Not in Database</th>
	</tr>
	<tr>
		<td width="33%">
			<textarea rows="15" bind:this={urlInput} on:change={checkURLs}></textarea>
		</td>
		<td width="33%">
			<div class='inDB'>
				{#each urlInDatabase as item}
					{#if item.track_id}
						<div>
							<a href={"/track/" + item.track_id}>{item.track_id}</a>
							<span>{item.url}</span> 
						</div>
					{/if}
					{#if item.album}
						<div>
							<a href={"/album/" + item.album}>{item.album}</a>
							<span>{item.url}</span> 
						</div>
					{/if}
				{/each}
			</div>
			
		</td>
		<td width="33%">
			<textarea rows="15" bind:value={urlOutput}></textarea>
		</td>
	</tr>
</table>
	



<h2>YouTube Channels</h2>

<p>TODO, eventually we'll want to have a way of scanning brony youtubers and automatically checking which URLs have been added already and which ones haven't</p>

<style>

	h2 + p, h1 + p, p + h2, h1 + h2, h2 + p,h3+p, p+h3{
		margin-top: 0px;
	}

	textarea{
		width: 100%;
	}
	input {
		margin-right: 3px;
		width: 2.5in;
	}

	.inDB{
		padding-left: 10px;
		padding-right: 10px;
		overflow-y: auto;
		height: 250px;
		font-size: 10pt;
		word-wrap: wrap;
	}

</style>

<script>
	import { onMount } from 'svelte';
	import TagGroupInput from "./TagGroupInput.svelte";
	import {tagComp} from "./helpers.js";
	import RadioGroup from "./RadioGroup.svelte";

	let compiled, compiled2, source, source2, ref, tagProperty, tagValue, tagNumber;

	let enteringTag = false;
	let tags = [];
	let nameOverrides = [];
	let urlInput = null;
	let urlOutput = "";
	let urlInDatabase = [];

	let parseRule = Number(localStorage.parseRule || 1);
	localStorage.parseRule = parseRule;

	try{
		tags = JSON.parse(localStorage.autoImportTags);
	}
	catch(e){};

	function mount(){

		compiled.value = "javascript:(function(){" + source.value.replace(/\n|\t/g, "") + "})()";
		compiled2.value = "javascript:(function(){" + source2.value.replace(/\n|\t/g, "") + "})()";
	}


	onMount(mount);

	async function checkURLs()
	{
		let urls = urlInput.value.split(/\r?\n/g);

		let request = await fetch("/api/checkURLs", {
			method: "POST",
			headers: {"Content-Type": "text/json"},
			body: JSON.stringify(urls)
		});

		let data = await request.json();

		urlOutput = "";
		urlInDatabase = [];
		for(let row of data)
		{
			let [url, result] = row;

			if(result == null)
				urlOutput += url + "\r\n";
			else{
				result.url = url;
				urlInDatabase.push(result);
			}
		}

		//urlOutput =JSON.stringify(data,"","\t");

	}
</script>