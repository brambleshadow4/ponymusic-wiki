<script>
	
	import TagEntryInput from "./TagEntryInput.svelte";
	import TrackHistory from "./TrackHistory.svelte";
	import Tag from "./Tag.svelte";
	import TrackWarnings from "./TrackWarnings.svelte";
	import Spinner from "./Spinner.svelte";
	import { createEventDispatcher } from 'svelte';
	import {tagComp, setUserFlag} from "./helpers.js";
	import {PERM, hasPerm} from "./authClient.js";
	import {parseTitle} from "./titleParsing.js";
	import { onMount } from 'svelte';

	const dispatch = createEventDispatcher();

	let track = {title:"", release_date:"", tags:[]};
	let hasProp = new Set();

	let enteringTag = false;
	let tagProperty = "";
	let tagValue = "";
	let tagNumber = undefined;
	let ref;
	let trackDeleted = false;
	let errorMessage = "";
	let trackWarnings = [];
	let scrapedTitle = "";

	let activeUserFlag = 0;

	export let id = "new";
	export let mode = 0;

	let tabProps = [[0, "Track"],[1, "Edit"],[2,"History"]];

	let nameInput;
	let dateInput;

	let mediaEmbed = [];
	let audioEmbed = "";

	let spinner1 = false;
	let sendingRequest = false;
	let getWarningsChannelStatus = 0;

	async function load()
	{
		tabProps = [];

		if(id != "new")
		{
			spinner1 = true;

			track = await (await fetch("/api/track/" + id + "?session=" + localStorage.session)).json();

			if(track.deleted) // it's been deleted
			{
				tabProps = [[2,"History"]];
				track = {title:"", release_date:"", tags:[]};
				mode = 2;

				spinner1 = false;
				return;
			}

			tabProps = [[0, "Track"],[1, "Edit"],[2,"History"]];

			if(!hasPerm(PERM.UPDATE_TRACK))
			{
				tabProps.splice(1,1);
			}

			track.tags.sort(tagComp);
			track.tags = track.tags;
			updateHasProperty();

			if(track.userFlags)
			{
				activeUserFlag = track.userFlags.status;
			}
			
			mode = 0;
			enteringTag = false;
			spinner1 = false;
		}
		else
		{
			mode = 1;
			tabProps = [];
			setTimeout(parseImportParams, 0);
		}

		if(sessionStorage.merge_data)
		{
			let mergeData = JSON.parse(sessionStorage.merge_data);

			if(mergeData.id == track.id)
				mode = 1;	

			if(!track.release_date || track.release_date > mergeData.release_date)
			{
				track.release_date = mergeData.release_date;
			}

			if(mergeData.id == "new")
				track.title = mergeData.title;


			scrapedTitle = mergeData.title;

			for(let tag of mergeData.tags)
			{
				addTag(tag);
			}

			delete sessionStorage.merge_data;
		}
	}

	function updateHasProperty()
	{
		hasProp = {};
		for(var k in track.tags)
		{
			hasProp[track.tags[k].property] = track.tags[k].value;
		}
		hasProp = hasProp;
	}

	onMount(load);

	function btnClass(hasProp, prop, val)
	{
		if(val){
			return hasProp[prop] == val ? "added" : "";
		}
		else{
			return hasProp[prop] ? "added" : "";
		}
	}

	function formatDate(dte)
	{
		let months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
		let year = dte.substring(0,4)
		let month = months[Number(dte.substring(5,7)-1)];
		let day = Number(dte.substring(8,10))

		return `${month} ${day}, ${year}`;
	}

	function addTagEntryField(tagType)
	{
		return function()
		{
			if(ref) {
				ref.value = "";
			}

			tagProperty = tagType;
			tagValue = "";
			tagNumber = tagType == "album" ? 0 : undefined;
			enteringTag = true;
			setTimeout(()=>{ref.focus()}, 10);
		}
	}

	function onEntry(e)
	{
		addTag(e.detail)
		enteringTag = false;
	}

	function addTag(tag)
	{
		if(!tag.value){ return; }

		// skip if tag is already added
		if(track.tags.filter(x => x.value == tag.value && x.property == tag.property && x.number == tag.number).length)
		{
			return;
		}

		if(tag.property == "pl")
		{
			for(let i=0; i<track.tags.length; i++)
			{
				if(track.tags[i].property == "pl")
				{
					track.tags.splice(i, 1)
					i--;
				}
			}
		}

		track.tags.push(tag);
		track.tags.sort(tagComp);
		track.tags = track.tags;

		updateHasProperty();

		let props = ["hyperlink", "reupload hyperlink", "alt mix hyperlink", "artist", "featured artist", "youtube offset"];
		if(props.indexOf(tag.property) != -1)
		{
			getTrackWarnings();
		}

		if(tag.property == "remix" || tag.property == "cover")
		{
			removeTag({"property":"tag","value":"x-needs-remixcover-linking"})();
		}
	};

	function removeTag(tag)
	{
		return function()
		{
			for(let i=0; i<track.tags.length; i++)
			{
				let otherTag = track.tags[i];
				if(otherTag.property == tag.property && otherTag.value == tag.value && otherTag.number == tag.number)
				{
					track.tags.splice(i, 1)
					break;
				}
			}

			track.tags = track.tags;
			updateHasProperty();

			if(tag.property == "hyperlink" || tag.property == "artist" || tag.property == "featured artist")
			{
				getTrackWarnings();
			}
		}
	}

	async function getTrackWarnings()
	{
		if(getWarningsChannelStatus == 0)
		{
			getWarningsChannelStatus = 1;
			

			var data = 
			{
				id,
				title: nameInput && nameInput.value.trim() || "", // nameInput can be undefined during merge
				tags: track.tags,
				session: sessionStorage.session
			}

			var response = {};
			try 
			{
				response = await (await fetch("/api/getTrackWarnings", {
					method: "POST",
					headers: {"Content-Type": "text/json"},
					body: JSON.stringify(data)
				})).json();
			}
			catch(e){};

			trackWarnings = response || {};

			// if we find out two artist aliases are the same, remove one
			let checkForDupes = false
			let artistTags = track.tags.filter(x => x.property == "artist" || x.property == "featured artist");

			for(let tag of artistTags)
			{
				if(trackWarnings.canonicalArtistNames[tag.value])
				{
					tag.value = trackWarnings.canonicalArtistNames[tag.value];
					tag.text = tag.value;
					checkForDupes = true;
					getWarningsChannelStatus = 2; // need to recheck warnings now that the canonical name is being used.
				}
			}

			if(checkForDupes)
			{
				for(let i=0; i < track.tags.length; i++)
				{
					let tag = track.tags[i];
					let count = track.tags.filter(x => x.property == tag.property && x.value == tag.value && x.number == tag.number).length;
					if(count > 1)
					{
						track.tags.splice(i, 1);
						i--;
					}
				}

				track.tags = track.tags;
			}
			
			// handle subsequent requests.
			if(getWarningsChannelStatus == 1)
			{
				getWarningsChannelStatus = 0;
			}
			else if (getWarningsChannelStatus == 2)
			{
				getWarningsChannelStatus = 0;
				getTrackWarnings();
			}
		}
		else if (getWarningsChannelStatus == 1)
		{
			getWarningsChannelStatus = 2;
		}
	}


	async function saveData()
	{
		sendingRequest = true;
		var data = {
			id,
			title: nameInput.value.trim(),
			release_date: dateInput.value.trim(),
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

		sendingRequest = false;

		if(response.status != 200)
		{
			errorMessage = "Request failed: " + (response.error || "");
			return;
		}

		if(id == "new")
		{
			id = response.id;
		}

		// update autoImport album tags
		let autoImportTags = [];
		try
		{
			autoImportTags = JSON.parse(localStorage.autoImportTags);
		}
		catch(e){};

		for(let tag of autoImportTags)
		{
			if(tag.property == "album")
			{
				for(let tag2 of track.tags)
				{
					if(tag2.property == "album" && tag.value == tag2.value && tag.number == tag2.number)
					{
						tag.number++;
						localStorage.autoImportTags = JSON.stringify(autoImportTags);
					}
				}		
			}
		}

		errorMessage = "";
		load();
	}

	async function hideTrack()
	{
		sendingRequest = true;
		let response = {};

		try 
		{
			let payload = {id, session: sessionStorage.session};
			if(track.hidden)
			{
				payload.unhide = true;
			}
			else
			{
				payload.hide = true;
			}

			response = await (await fetch("/api/track", 
			{
				method: "DELETE",
				headers: {"Content-Type": "text/json"},
				body: JSON.stringify(payload)
			})).json();
		}
		catch(e){}

		sendingRequest = false;

		if(response.status != 200)
		{
			errorMessage = "Request failed: " + (response.error || "");
		}
		else
		{	
			location.reload();
		}
	}

	async function deleteTrack(shouldHide)
	{
		sendingRequest = true;
		let response = {};

		try 
		{
			response = await (await fetch("/api/track", 
			{
				method: "DELETE",
				headers: {"Content-Type": "text/json"},
				body: JSON.stringify({id, session: sessionStorage.session})
			})).json();
		}
		catch(e){}

		sendingRequest = false;

		if(response.status != 200)
		{
			errorMessage = "Request failed: " + (response.error || "");
		}
		else
		{	
			dispatch("close");
		}
	}

	async function parseImportParams()
	{	
		let paramsRaw = window.location.search.substring(1);
		let params = {};
		paramsRaw = paramsRaw.split("&");
		
		for(let param of paramsRaw)
		{
			let [key, value] = param.split("=");
			params[key] = decodeURIComponent(value).replace(/&amp;/g, "&");
		}

		if(params['trackPost'])
		{
			let newTrack = JSON.parse(decodeURIComponent(params['trackPost']));
			track.title = newTrack.title;
			track.release_date = newTrack.release_date
			newTrack.tags.forEach(x => addTag(x));
			console.log(track)
		}

		if(params['artist'])
		{
			params['artist']
				.split("\x1E")
				.map(x => x.trim())
				.filter(x => x.length > 0)
				.forEach(x => {
					addTag({property:"artist", value: x, text: x});
				});
		}

		if(params['genre'])
		{
			let genreList = params['genre'].split("\x1E").map(x => x.trim());
			genreList.forEach(x => addTag({property: "genre", value: x, text: x}));
		}

		if(params['url'])
		{
			let qmark = params.url.indexOf("?");


			if(params.url.indexOf("youtube.com") > -1)
			{
				let urlParams = params.url.substring(qmark+1).split("&");
				let urlParamsDic = {};
				for(let pair of urlParams)
				{
					let [key, value] = pair.split("=");
					urlParamsDic[key] = value;
				}

				if(urlParamsDic.v)
				{
					params.url = params.url.substring(0,qmark+1) + "v=" + urlParamsDic.v;
				}
			}
			else
			{
				if(qmark > -1)
				{
					params.url = params.url.substring(0,qmark);
				}
			}

			addTag({property: "hyperlink", value: params['url'], text: params['url']});
		}

		if(params['title'])
		{
			scrapedTitle = params['title'].replace(/<\/?(span|a)[^>]*>/g,"");
			let result = parseTitle(scrapedTitle);

			track.title = result.title;
			for(let tag of result.tags)
			{
				addTag(tag);
			}
			
		}

		if(params['date'])
		{
			let rawDate = params['date'].toLowerCase();
			rawDate = rawDate.replace("premiered ", "");

			let match = /.*((january|february|march|april|may|june|july|august|september|october|november|december) \d\d?, \d\d\d\d).*/.exec(rawDate)

			if(match)
			{
				rawDate = match[1];
			}

			if(rawDate.indexOf("hours ago") > -1)
			{
				let d = new Date();
				track.release_date = new Date(d.getTime() - 1000*60*d.getTimezoneOffset()).toISOString().substring(0,10);
			}
			else
			{
				let d = new Date(rawDate);
				if (d.toISOString().substring(10) != "T00:00:00.000Z")
				{
					d = new Date(d.getTime() - d.getTimezoneOffset()*1000*60)
				}
				track.release_date = d.toISOString().substring(0,10)
			}
		}

		if(localStorage.autoImportTags)
		{
			let autoImportTags = [];
			try
			{
				autoImportTags = JSON.parse(localStorage.autoImportTags);
			}
			catch(e){};

			for(let tag of autoImportTags)
			{
				addTag(tag);
			}
		}

		getTrackWarnings();
	}

	function mergeTrack(mergeToID)
	{
		track.id = mergeToID;
		track.release_date = dateInput.value || track.release_date;
		sessionStorage["merge_data"] = JSON.stringify(track);
		window.location.href = "/track/" + mergeToID;
		setTimeout(function(){delete sessionStorage['merge_data']},500);
	}

	function changeUserFlag(button)
	{
		if(activeUserFlag == button)
			activeUserFlag = 0;
		else
			activeUserFlag = button;

		setUserFlag(id, "status", activeUserFlag || null);
	}
</script>

<style>
	.label 
	{
		display: inline-block;
		line-height: 35px;
	}

	.field .label
	{
		vertical-align: top;
		width: .8in;
		text-align: right;
	}

	.field { margin: 6px 0px; }

	.field-value
	{
		display: inline-block;
	}

	.post-tags{
		margin-top: 20px;
	}

	h1{
		margin-top: 0px;
		padding-top: 12pt
	}

	.h1-0{
		margin-bottom: 0;
	}

	h2 {margin-top: 0; font-size: 12pt}

	h2.subh2 {
		margin-top: 12pt;
		border-bottom: solid 1px black;
	}

	input {margin: 0px}

	.main {
		background-color: white;
		padding-left: .5in;

		height: calc(100% - 33px);

		overflow-y: auto;

		position: relative;
	}

	@media only screen and (max-width: 800px){
		.main {padding-left: 5px}
	}

	button.added {
		background-color: #D4F9D4;
	}

	button.added:active 
	{
		background-color: #C0E5C0;
	}

	.tabs
	{
		padding-left: 20px;
		padding-top: 5px;
		font-size: 16pt;
	}

	.tab-text{
		cursor: pointer;
	}

	.tabs > span{
		position: relative;
		margin: 0px 15px;
	}

	.tabs .selected.tab{
		border-bottom: 32px solid white;
		z-index: -1;
	}

	.remix-blurb {
		margin-bottom: 8pt;
	}

	.tabs .tab{
		border-bottom: 32px solid #E0E0E0;
		border-left: 16px solid transparent;
		border-right: 16px solid transparent;
		height: 0;

		box-sizing: border-box;

		position: absolute;
		left: -20px;
		right: -20px;
		top: 0;

		z-index: -2;
	}

	.indent {
		padding-left: .5in;
	}

	#name{
		width: calc(100% - 1.5in);
	}


	.userFlagButtons{
		margin-bottom: 10px;
	}

	.userFlagButton
	{
		margin-right: 10px;
		border: solid 1px #888;
		padding: 3px;
		padding-bottom: 6px;
		cursor: pointer;

		display: inline-block;

		white-space: nowrap;
	}

	.userFlagButton.selected
	{
		background-color: #b3d9ff;
	}

	.userFlagButton span
	{
		padding-left: 4px;
		vertical-align: middle;
		display: inline-block;
	}

	.userFlagButton img
	{
		vertical-align: middle;
		width: 20px;
	}

	.mini-button{
		padding: 2px;
		margin-left: 10px;
	}
	.mini-button:hover{
		background-color: #e4e4e4;
	}

	.hidden-banner
	{
		background-color: #ffeecc;
		border: solid 1px #ffcc66;
		margin-top: .3in;
		margin-right: .3in;
		padding: 10px;
	}

</style>



<div class='tabs'>
	{#each tabProps as tab}
		<span><span class={'tab-text '} on:click={() => {mode = tab[0]}}>{tab[1]}</span><span class={'tab' + (mode == tab[0] ? " selected" : "")} ></span></span>
	{/each}
</div>

<div class='main'>
	
	{#if spinner1}
		<Spinner />
	{:else}

		{#if id=="new"}
			<h1>Add Track</h1>
		{:else}

			{#if track.hidden}
				<div class='hidden-banner'>Track is hidden.</div>
			{/if}

			<h1 class={"h1-" + mode}>{track.title}</h1>
			{#if mode==0}<h2>{formatDate(track.release_date)}</h2>{/if}
		{/if}

		{#if mode==1}
			<div>
				<div class='field'>
					<span class="label">Title:</span>
					<input id='name' type="text" maxlength="255" bind:this={nameInput} on:input={getTrackWarnings} value={track.title}/>
				</div>
				
				<div class='field'>
					<span class="label">Released:</span>
					<input id='release-date' type="date" bind:this={dateInput} value={track.release_date.substring(0,10)}/>
				</div>

				{#if scrapedTitle}
					
					<div><span class="label">Scraped Title:</span></div>
					<div><input id='name' type="text" readonly maxlength="255" value={scrapedTitle}/></div>
				{/if}
			</div>
		{:else if mode ==2}
			<TrackHistory id={id} on:reloadtrack={load}/>
			
		{:else}
			{#if track.ogcache && track.ogcache.embed}
				<iframe title="Embeded track" src={track.ogcache.embed} width={Math.min(track.ogcache.width, window.innerWidth-63)} height={track.ogcache.height} 
					frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen

				></iframe>
			{:else if track.ogcache && track.ogcache.audio}
				<audio controls>
					<source src={track.ogcache.audio} />
				</audio> 
			{/if}
			{#if Number(track.remixCount) || Number(track.coverCount)}
				<div class='remix-blurb'>
					<a href={"/remix/"+track.id + "-" + encodeURIComponent(track.titlecache)}>
						{#if Number(track.remixCount)}{track.remixCount} remixes{/if}{#if Number(track.remixCount) && Number(track.coverCount)},{/if}
						{#if Number(track.coverCount)}{track.coverCount} covers{/if}
					</a>
				</div>
			{/if}

			{#if hasPerm(PERM.USER_FLAGS)}
				<div class="userFlagButtons">
					{#each [["Heard it","/notes.png"],["Listen Later","/later.png"],["Skip","/rest.png"],["Star", "/star-unfilled.svg", "/star-filled.svg"]] as pair,i}
						<span class={"userFlagButton" + (i+1 == activeUserFlag ? " selected" : "")} on:click={() => changeUserFlag(i+1)}>

							{#if pair[2] && i+1==activeUserFlag}
								<img class='icon' src={pair[2]}/>
							{:else}
								<img class='icon' src={pair[1]}/>
							{/if}
							<span>{pair[0]}</span>
						</span>
					{/each}
				</div>
			{/if}
		{/if}

		{#if mode== 0 || mode == 1}
			<div>Tags:</div>
			<div>
					
				{#each track.tags as tag}
					<Tag canRemove={mode==1} tag={tag} on:remove={removeTag(tag)}/>
				{/each}

				{#if enteringTag}
					<TagEntryInput 
						property={tagProperty}
						value={tagValue}
						number={tagNumber}
						bind:ref
						on:valueSet={onEntry}
					/>

				{/if}			
			</div>
		{/if}

		{#if mode==1}
			<div class='field post-tags'>

				<div>
					<button class={btnClass(hasProp, "hyperlink")} on:click={addTagEntryField("hyperlink")}>+ Hyperlink</button>
					<button class={btnClass(hasProp, "artist")} on:click={addTagEntryField("artist")}>+ Artist</button>
					<button
						class={btnClass(hasProp, "featured artist")}
						on:click={addTagEntryField("featured artist")}>+ Featured Artist</button>
					<button
						class={btnClass(hasProp, "cover")}
						on:click={addTagEntryField("cover")}>+ Cover</button>
					<button
						class={btnClass(hasProp, "remix")}
						on:click={addTagEntryField("remix")}>+ Remix</button>
				</div>
				<div>
					<button class={btnClass(hasProp, "pl","2")} on:click={()=>{addTag({property:"pl",value:"2"})}}>Obvious Refs</button>
					<button class={btnClass(hasProp, "pl","1")} on:click={()=>{addTag({property:"pl",value:"1"})}}>Subtle Refs</button>
					<button class={btnClass(hasProp, "pl","0")} on:click={()=>{addTag({property:"pl",value:"0"})}}>No refs</button>
					<a target="_blank" href="/pony-refs">What's this?</a>
				</div>
				<div>
					<button class={btnClass(hasProp, "genre")} on:click={addTagEntryField("genre")}>+ Genre</button>
					<button class={btnClass(hasProp, "album")} on:click={addTagEntryField("album")}>+ Album</button>
					<button class={btnClass(hasProp, "tag")} on:click={addTagEntryField("tag")}>+ Tag</button>
					<!--<button>+ Remix</button>-->
				</div>
				
				<TrackWarnings warnings={trackWarnings} on:merge={(e) => mergeTrack(e.detail)}/>
	
			</div>

			<div>
				{#if hasPerm(PERM.UPDATE_TRACK)}
					<button on:click={saveData} disabled={sendingRequest}>Update</button>
				{:else if !sessionStorage.session}
					<p>Sign in to make edits to the wiki</p>
				{/if}
				{#if hasPerm(PERM.DELETE_TRACK) && id != "new"}	
					<button style="float: right; margin-right:.5in" on:click={deleteTrack} disabled={sendingRequest}>Delete</button>
					<button style="float: right;" on:click={hideTrack} disabled={sendingRequest}>{track.hidden ? "Unhide" : "Hide"}</button>
				{/if}
				{#if errorMessage}
					<p>{errorMessage}</p>
				{/if}
				{#if sendingRequest}
					<Spinner />
				{/if}

			</div>
		{/if}

		{#if mode==0}
			{#if track.originalTracks && track.originalTracks.length > 0}
				<h2 class="subh2">Original track</h2>

				{#each track.originalTracks as track2}
					<p><a href={"/track/" + track2.id}> {track2.titlecache}</a></p>

					{#if track2.ogcache && track2.ogcache.embed}
						<iframe title="Embeded track" src={track2.ogcache.embed} width={Math.min(track2.ogcache.width, window.innerWidth-63)} height={track2.ogcache.height} 
							frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen

						></iframe>
					{:else if track2.ogcache && track2.ogcache.audio}
						<audio controls>
							<source src={track2.ogcache.audio} />
						</audio> 
					{/if}
				{/each}
			{/if}
			<div style="height: .5in;"> </div>
			
		{/if}
	{/if}

</div>
 