<script>
	
	import TagEntryInput from "./TagEntryInput.svelte";
	import TrackHistory from "./TrackHistory.svelte";
	import Tag from "./Tag.svelte";
	import { createEventDispatcher } from 'svelte';
	import {tagComp} from "./tagHelpers.js";

	const dispatch = createEventDispatcher();

	let track = {title:"", release_date:"", tags:[]};

	let enteringTag = false;
	let tagProperty = "";
	let tagValue = "";
	let tagNumber = undefined;
	let ref;


	export let id = "new";
	export let mode = 0;

	let tabProps = [[0, "Track"],[1, "Edit"],[2,"History"]];

	let nameInput;
	let dateInput;

	let mediaEmbed = [];
	let audioEmbed = "";

	async function load()
	{
		tabProps = [[0, "Track"],[1, "Edit"],[2,"History"]];

		if(id != "new")
		{
			console.log("loading stuff")
			track = await (await fetch("/api/track/" + id)).json();

			track.tags.sort(tagComp);
			track.tags = track.tags;

			mode = 0;
			enteringTag = false;
		}
		else
		{
			mode = 1;
			tabProps = [];
		}
	}

	load();

	function formatDate(dte)
	{
		let months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

		console.log(dte);
		let year = dte.substring(0,4)
		let month = months[Number(dte.substring(5,7)-1)];
		let day = Number(dte.substring(8,10))

		return `${month} ${day}, ${year}`;
	}

	function addTagEntryField(tagType)
	{
		return function(){

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
	};

	function removeTag(tag)
	{
		return function()
		{
			for(let i=0; i<track.tags.length; i++)
			{
				console.log(track.tags[i]);

				if(track.tags[i].property == tag.property && track.tags[i].value == tag.value)
				{
					track.tags.splice(i, 1)
					break;
				}
			}

			track.tags = track.tags;
		}
	}

	async function saveData()
	{
		var data = {
			id,
			title: nameInput.value.trim(),
			release_date: dateInput.value.trim(),
			tags: track.tags,
			session: sessionStorage.session
		}

		var response = await (await fetch("/api/track", {
			method: "POST",
			headers: {"Content-Type": "text/json"},
			body: JSON.stringify(data)
		})).json();


		if(id == "new"){
			id = response.id;
		}

		load();
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

	h1 button{
		font-size: 12pt;
		line-height: 12pt;
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

</style>



<div class='tabs'>
	{#each tabProps as tab}
		<span><span class={'tab-text '} on:click={() => {mode = tab[0]}}>{tab[1]}</span><span class={'tab' + (mode == tab[0] ? " selected" : "")} ></span></span>
	{/each}
</div>



<div class='main'>
	
	{#if id=="new"}
		<h1>Add Track</h1>
	{:else}
		<h1 class={"h1-" + mode}>{track.title}</h1>
		{#if mode==0}<h2>{formatDate(track.release_date)}</h2>{/if}
	{/if}

	{#if mode==1}
		<div>
			
			<div class='field'>
				<span class="label" >Title:</span>
				<input id='name' type="text" maxlength="255" bind:this={nameInput} value={track.title}/>
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
			<iframe src={track.ogcache.embed} width={track.ogcache.width} height={track.ogcache.height} 
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

		<div id="tag-warnings"></div>
	</div>
	{/if}

	{#if mode==1}
		<div class='field post-tags'>

			<div>
				<button on:click={addTagEntryField("hyperlink")}>+ Hyperlink</button>
				<button on:click={addTagEntryField("artist")}>+ Artist</button>
				<button on:click={addTagEntryField("featured artist")}>+ Featured Artist</button></div>
			<div>
				<button on:click={()=>{addTag({property:"pl",value:"2"})}}>Obvious Refs</button>
				<button on:click={()=>{addTag({property:"pl",value:"1"})}}>Sublte Refs</button>
				<button on:click={()=>{addTag({property:"pl",value:"0"})}}>No refs</button>
			</div>
			<div>
				<button on:click={addTagEntryField("genre")}>+ Genre</button>
				<button on:click={addTagEntryField("album")}>+ Album</button>
				<button>+ Remix</button>
			</div>
		</div>

	<div><button on:click={saveData}>Update</button></div>

	{/if}

</div>
