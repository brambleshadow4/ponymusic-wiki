<h1>Import Tools</h1>


<h2 id="Import_Single_Track">Importing a single track</h2>
<p>PMW offers a bookmarklet, which is a piece of javascript that you can add as a bookmark to your browser. When you it, it scrapes the page for a few pieces of information, and will then open thrack in ponymusic.wiki where you can correct any spellings and then add it quickly.</p>

<p>The bookmarklet works for YouTube, Bandcamp, and Soundcloud pages</p>

<div><img src="./bookmarklet.png" /></div>

<p>Below you'll find the code to use as the URL for the bookmarklet. <strong>It is generally unsafe to run code you don't understand from someone you don't trust</strong>. The source code is offered as well if you'd like to review it.</p>

<div><textarea rows="5" bind:this={compiled}></textarea></div>
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


<h3>Parse Rules</h3>

<p>The youTube/bandcamp title often contains names of artists/genres of the track. This setting controls how that information is parsed</p>

<RadioGroup 
	checked={parseRule}
	options={["No Parsing", "<artist1>, <artist2> & <artist3> - Track Title (feat. <featuredArtist>)[<genre>]"]} 
	on:change={(e) => {localStorage.parseRule = e.detail}}
	/>


<h2 id="">Finding missing tracks</h2>

<p>If you scouring youtube/bandcamp/soundcloud for missing pony music, try using the following bookmarklet which will quickly let you know which songs are/aren't in ponymusic wiki</p>

<div><textarea rows="5" bind:this={compiled2}></textarea></div>
<div><img src="/img/real_time_status.png" height=600/></div>
<h3>Source code</h3>

<div><textarea  rows="10" bind:this={source2}>{
`(function(){

	let notInPMW = new Set();
	let inPMW = new Set();
	let inMiddleOfRequest = false;

	function isGoodURL(url)
	{
		if(/https:\\/\\/www.youtube\\.com\\/watch\\?v=.*/.exec(url))
			return true;

		if(/https:\\/\\/soundcloud\\.com.*/.exec(url))
		{
			let match = /soundcloud.com\\/([^\\/]*)\\/([^\\/]*)$/.exec(url);

			if(!match)
				return false;

			if(["you","tags","pages","charts"].indexOf(match[1]) > -1)
				return false;
			if(["popular-tracks","tracks","albums","sets","reposts","followers","following","comments"].indexOf(match[2]) > -1)
				return false;

			return true;
		}

		if(url.indexOf(".bandcamp.com/" > -1))
		{
			if(!/bandcamp\\.com\\/album\\/.*|bandcamp\\.com\\/track\\/.*/.exec(url))
				return false;

			if(url.endsWith("#"))
				return false; 
			if(url.indexOf("#lyrics") > -1)
				return false;
			if(url.indexOf("action=download") > -1)
				return false;

			return true;
		}
	}

	async function loop()
	{
		let linkEls = document.getElementsByTagName('a');
		let nextBatch = [];
		for(let i=0; i<linkEls.length; i++)
		{
			nextBatch.push(linkEls[i].href);
		}

		nextBatch = nextBatch.filter(isGoodURL);
		nextBatch = nextBatch.filter(x => !inPMW.has(x) && !notInPMW.has(x));
		nextBatch = [... new Set(nextBatch)];

		if(inMiddleOfRequest || nextBatch.length == 0)
			return;

		inMiddleOfRequest = true;

		let resp = await fetch("https://ponymusic.wiki/api/checkURLs",{
			method: "POST",
			headers: {"Content-Type": "text/json"},
			body: JSON.stringify(nextBatch)
		});

		let values = await resp.json();

		inMiddleOfRequest = false;

		for(let [url,val] of values)
		{
			if(val == null)
				notInPMW.add(url);
			else {
				inPMW.add(url);
			}
		}

		for(let i=0; i<linkEls.length; i++)
		{
			if(linkEls[i].getElementsByClassName('pmwStatus').length)
				continue;

			if(notInPMW.has(linkEls[i].href))
			{
				let floater = document.createElement('span');
				floater.innerHTML = "PMW ✗";
				floater.className = "pmwStatus";
				floater.style.backgroundColor = "red";
				floater.style.padding = "3px";
				floater.style.borderRadius = "3px";
				floater.style.color = "white";
				linkEls[i].appendChild(floater);
			}
			if(inPMW.has(linkEls[i].href))
			{
				let floater = document.createElement('span');
				floater.innerHTML = "PMW ✓";
				floater.className = "pmwStatus";
				floater.style.backgroundColor = "green";
				floater.style.padding = "3px";
				floater.style.borderRadius = "3px";
				floater.style.color = "white";
				linkEls[i].appendChild(floater);
			}
		}
	}
	setInterval(loop, 1000);
	
})()`
}</textarea></div>

<h2 id="Check_URLs">Check URLs</h2>
<p>If you have an existing list of URLs from another data set, you can copy them in here to quickly check if they are tracked in ponymuisc.wiki.  Each URL should be on its own line.</p>
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
	import TagGroupInput from "../TagGroupInput.svelte";
	import {tagComp} from "../helpers.js";
	import RadioGroup from "../RadioGroup.svelte";

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