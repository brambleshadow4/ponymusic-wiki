<script>
	
	import TagEntryInput from "./TagEntryInput.svelte";
	import Tag from "./Tag.svelte";
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	let track = {title:"", release_date:"", tags:[]};

	let enteringTag = false;
	let tagProperty = "";
	let tagValue = "";
	let tagNumber = undefined;
	let ref;

	export let id = "new";


	let editMode = false;

	if(id=="new"){
		editMode = true;
	}

	let nameInput;
	let dateInput;

	let mediaEmbed = [];
	let audioEmbed = "";

	async function load()
	{
		if(id != "new"){
			console.log("loading stuff")
			track = await (await fetch("/api/track/" + id)).json();

			track.tags.sort(tagComp);
			track.tags = track.tags;
		}
	}

	function edit(){
		editMode = true;
	}

	load();


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

	function tagComp(tag1, tag2){

		if(tag1.property == tag2.property){
			if (tag1.value > tag2.value) return 1;
			if (tag2.value > tag1.value) return -1;

			return 0;  
		}

		let k = propertyOrder(tag1.property) - propertyOrder(tag2.property);
		if(k != 0) return k;

		if (tag1.property > tag2.property) return 1;
		if (tag2.property > tag1.property) return -1;
		return 0;
	}

	function propertyOrder(prop){
		switch(prop){
			case "hyperlink": return 0;
			case "artist": return 1;
			case "featured artist": return 2;
			case "pl": return 3;
			default: return 4;
		}
	}

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

		console.log(response);

		dispatch("close","");
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

	input {margin: 0px}

</style>


{#if id=="new"}
	<h1>Add Track</h1>
{:else}
	<h1>
		{track.title} {#if !editMode}<button class='edit-button' on:click={edit}>Edit</button>{/if}
	</h1>
{/if}

{#if editMode}
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

<div>Tags:</div>
<div>
		
	{#each track.tags as tag}
		<Tag canRemove={editMode} tag={tag} on:remove={removeTag(tag)}/>
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

{#if editMode}
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
