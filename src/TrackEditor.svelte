<script>
	
	import TagEntryInput from "./TagEntryInput.svelte";
	import TrackHistory from "./TrackHistory.svelte";
	import Tag from "./Tag.svelte";
	import Spinner from "./Spinner.svelte";
	import { createEventDispatcher } from 'svelte';
	import {tagComp} from "./helpers.js";
	import {PERM, hasPerm} from "./authClient.js";
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
	let duplicates = [];
	let nameOverrides = {};

	export let id = "new";
	export let mode = 0;

	let tabProps = [[0, "Track"],[1, "Edit"],[2,"History"]];

	let nameInput;
	let dateInput;

	let mediaEmbed = [];
	let audioEmbed = "";

	let spinner1 = false;
	let sendingRequest = false;
	let findDuplicatesChannelStatus = 0;

	async function load()
	{
		tabProps = [];

		if(id != "new")
		{
			spinner1 = true;

			track = await (await fetch("/api/track/" + id)).json();

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

		if(tag.property == "hyperlink")
		{
			findDuplicates();
		}
	};

	function removeTag(tag)
	{
		return function()
		{
			for(let i=0; i<track.tags.length; i++)
			{
				if(track.tags[i].property == tag.property && track.tags[i].value == tag.value)
				{
					track.tags.splice(i, 1)
					break;
				}
			}

			track.tags = track.tags;
			updateHasProperty();
		}
	}

	async function findDuplicates()
	{
		if(findDuplicatesChannelStatus == 0)
		{
			findDuplicatesChannelStatus = 1;

			var data = 
			{
				id,
				title: nameInput.value.trim(),
				tags: track.tags,
				session: sessionStorage.session
			}

			var response = {};
			try 
			{
				response = await (await fetch("/api/findDuplicates", {
					method: "POST",
					headers: {"Content-Type": "text/json"},
					body: JSON.stringify(data)
				})).json();
			}
			catch(e){};

			duplicates = response.duplicates || [];

			// handle subsequent requests.
			if(findDuplicatesChannelStatus == 1)
			{
				findDuplicatesChannelStatus = 0;
			}
			else if (findDuplicatesChannelStatus == 2)
			{
				findDuplicatesChannelStatus = 0;
				findDuplicates();
			}
		}
		else if (findDuplicatesChannelStatus == 1)
		{
			findDuplicatesChannelStatus = 2;
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

		if(id == "new"){
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

	async function deleteTrack()
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

		nameOverrides = {};
		let nameOverridesRaw = [];
		try{
			nameOverridesRaw = JSON.parse(localStorage.nameOverrides)
		}
		catch(e){};

		for(let pair of nameOverridesRaw)
		{
			nameOverrides[pair[0]] = pair[1];
		}
		
		for(let param of paramsRaw)
		{
			let [key, value] = param.split("=");
			params[key] = decodeURIComponent(value).replace(/&amp;/g, "&");
		}

		if(params['artist'])
		{
			addParsedArtist(params['artist'], "artist");
		}

		if(params['url'])
		{
			addTag({property: "hyperlink", value: params['url']});
		}

		if(params['title'])
		{
			let parseRule = localStorage.parseRule;
			if(parseRule == "1" || parseRule == undefined)
			{
				let match = /(?:(.*)?(?:-|–))?(.*)/.exec(params['title']);

				let artists = (match[1] || "").trim();
				let parsedTitle = match[2].trim();
				
				if(artists)
				{
					artists = artists.split(/,|&/g).map(x => x.trim()).filter(x => x);

					for(let artist of artists)
					{
						addParsedArtist(artist, "artist");
					}
				}

				track.title = parsedTitle;

				match = /.*\(fe?a?t?\. (.*)\)/.exec(parsedTitle);
				if(match && match[1])
				{
					console.log(match)
					artists = match[1].split(/,|&/g).map(x => x.trim()).filter(x => x);

					for(let artist of artists)
					{
						addParsedArtist(artist, "featured artist");
					}
				}

			}
			if(parseRule == "0")
			{
				track.title = params['title']
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
				track.release_date = new Date(rawDate).toISOString().substring(0,10);
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
	}

	/**
	 * prop should be "artist" or "featured artist"
	 */
	function addParsedArtist(artistName, property)
	{
		let trueName = nameOverrides[artistName] != undefined ? nameOverrides[artistName] : artistName;
		if(trueName)
		{
			addTag({property, value: trueName});
		}
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

	input {margin: 0px}

	.main {
		background-color: white;
		padding-left: .5in;

		height: calc(100vh - 33px);

		overflow-y: auto;

		position: relative;
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

	.tag-warnings
	{
		background-color: #fff7e6;
		border: solid 1px #ffcc66;
		padding: 10px;
		margin-right: .5in;
	}

	#name{
		width: calc(100% - 1.5in);
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
			<h1 class={"h1-" + mode}>{track.title}</h1>
			{#if mode==0}<h2>{formatDate(track.release_date)}</h2>{/if}
		{/if}

		{#if mode==1}
			<div>
				<div class='field'>
					<span class="label">Title:</span>
					<input id='name' type="text" maxlength="255" bind:this={nameInput} on:input={findDuplicates} value={track.title}/>
				</div>
				<div class='field'>
					<span class="label">Released:</span>
					<input id='release-date' type="date" bind:this={dateInput} value={track.release_date.substring(0,10)}/>
				</div>
			</div>
		{:else if mode ==2}
			<TrackHistory id={id} on:reloadtrack={load}/>
			
		{:else}
			{#if track.ogcache && track.ogcache.embed}
				<iframe title="Embeded track" src={track.ogcache.embed} width={track.ogcache.width} height={track.ogcache.height} 
					frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen

				></iframe>
			{:else if track.ogcache && track.ogcache.audio}
				<audio controls>
					<source src={track.ogcache.audio} />
				</audio> 
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
						on:click={addTagEntryField("featured artist")}>+ Featured Artist</button></div>
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
				
				{#if duplicates.length}
					<div class="tag-warnings">
						<div>This track has the same title/hyperlink as other tracks. Please make sure it is not a duplicate of the following:<br><br></div>
						{#each duplicates as item}
							<div>{item.value}: {#each item.duplicates as num}<a target="_blank" href={"/track/" + num}>{num}</a> {/each}</div>
						{/each}
					</div>
				{/if}
			</div>

			<div>
				{#if hasPerm(PERM.UPDATE_TRACK)}
					<button on:click={saveData} disabled={sendingRequest}>Update</button>
				{:else if !sessionStorage.session}
					<p>Sign in to make edits to the wiki</p>
				{/if}
				{#if hasPerm(PERM.DELETE_TRACK) && id != "new"}
					<button style="float: right; margin-right:.5in" on:click={deleteTrack} disabled={sendingRequest}>Delete</button>
				{/if}
				{#if errorMessage}
					<p>{errorMessage}</p>
				{/if}
				{#if sendingRequest}
					<Spinner />
				{/if}

			</div>
		{/if}
	{/if}

</div>
