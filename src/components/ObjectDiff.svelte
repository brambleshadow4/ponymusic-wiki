<script>

	

	import {tagComp} from "../helpers.js";
	import Tag from "../Tag.svelte";
	import {createEventDispatcher} from "svelte";

	export let value = {};
	export let noTitle = false;
	export let noIndent = false;

	let dispatch = createEventDispatcher();
	let current = value.value;
	let previous = value.previous_value || {};

	let propertyChanges = getPropertyChanges(value)
	let [addedTags, removedTags] = getTagChanges(value);



	function getPropertyChanges(value)
	{
		if(value.type == "track")
			return [[],[]];


		let currentSet = {};
		let previousSet = {};
		let propertyChanges = [];

		let props = [];
		if(value.value)
			props = value.value.properties;

		for(let [prop, value] of props)
		{
			currentSet[prop+"/"+value] = [prop,value];
		}

		props = [];
		if(value.previous_value)
			props = value.previous_value.properties;

		for(let [prop, value] of props)
		{
			previousSet[prop+"/"+value] = [prop,value];
		}

		for(let key in currentSet)
		{
			if (!previousSet[key])
				propertyChanges.push(["", currentSet[key][0] + ": " + currentSet[key][1]]);
		}
		for(let key in previousSet)
		{
			if (!currentSet[key])
				propertyChanges.push([previousSet[key][0] + ": " + previousSet[key][1], ""]);
		}

		return propertyChanges
	}

	function getTagChanges(value)
	{
		if(value.type != "track" || value.value.deleted)
			return [[],[]]


		let current = value.value || {};
		let previous = value.previous_value || {};

		let tagsAdded = [];
		let tagsRemoved = [];

		if(!previous.tags)
			previous.tags = [];

		if(!current.tags)
			current.tags = [];

		current.tags.sort(tagComp);
		previous.tags.sort(tagComp);

		for(let tag of current.tags)
		{
			if(tag.property == "original artist")
				continue;

			let count = previous.tags.filter(x => tagComp(tag, x) == 0).length;



			if(count == 0){
				tagsAdded.push(tag);
			}
		}

		for(let tag of previous.tags)
		{
			if(tag.property == "original artist")
				continue;
			
			let count = current.tags.filter(x => tagComp(tag, x) == 0).length;
			if(count == 0){
				tagsRemoved.push(tag);
			}
		}

		if(value.id == 399)
		{
			console.log(tagsRemoved)
		}

		return [tagsAdded, tagsRemoved];
	}

	function shorten(s)
	{
		if(s.length > 50)
			return s.substring(0,47)+ "..."
		return s;
	}

	function open()
	{
		dispatch("open", {type: value.type, "id": value.id});
	}

	function trackTitle(item)
	{
		if(item.title)
			return item.title
		else 
			return "deleted(" + item.id + ")";
	}

</script>
<style>
	.summary {font-weight: bold;}
	.diff {margin-bottom: 20px}
	.added {color: green}
	.removed {color: red}
	td {min-width: 1in}

	table {margin-left: .5in}
	.noIndent table {
		margin-left: 0px;
	}


	.hidden
	{
		background-color: #ffeecc;
		border: solid 1px #ffcc66;
		display: inline-block;
		margin-top: 10px;
		margin-left: .5in;
		padding: 5px;
	}

	.noIndent .hidden {
		margin-left: 0px;
	}

	.deleted
	{
		background-color: #ffcccc;
		border: solid 1px red;
		display: inline-block;
		margin-top: 10px;
		margin-left: .5in;
		padding: 5px;
	}

	.noIndent .deleted {
		margin-left: 0px;
	}


	.indent {
		margin-left: .5in;
	}

	.noIndent .indent {
		margin-left: 0px;
	}

</style>
<div class={'diff ' + (noIndent ? "noIndent" : "")}>
	<div on:click={(e) => dispatch("click",e)} class='summary'>{value.user} – {new Date(value.timestamp).toLocaleString()}

		{#if !noTitle} –
			{#if value.type == "track"}
				🎶 <a on:click={open}>{trackTitle(value)}</a>
			{:else if value.type == "artist"}
				🎨 <a on:click={open}>{value.id}</a>
			{:else if value.type == "album"}
				💿 <a on:click={open}>{value.id}</a>
			{/if}
		{/if}
	</div>


	{#if value.type == "track"}

		{#if current.deleted}
			<span class='deleted'>Track deleted</span>
		{:else}
			<!-- Track Hidden/Unhidden are needed for legacy entries. Seee edits on 2/13/2025 for examples -->
			{#if current.hidden && !previous.hidden && removedTags.length == 0 && addedTags.length == 0 }<span class='hidden'>Track hidden</span>{/if}
			{#if !current.hidden && previous.hidden && removedTags.length == 0 && addedTags.length == 0}<span class='hidden'>Track unhidden</span>{/if}
			{#if current.title != previous.title}
				<div class='indent'>Title: {previous.title || ""} => {current.title || ""}</div>
			{/if}
			{#if current.release_date != previous.release_date}
				<div class='indent'>Release Date: {previous.release_date || ""} => {current.release_date || ""}</div>
			{/if}

			{#if addedTags.length}
				<div class='indent'>Tags added: {#each addedTags as aTag}<Tag tag={aTag}/> {/each}</div>
			{/if}

			{#if removedTags.length}
				<div class='indent'>Tags removed: {#each removedTags as aTag}<Tag tag={aTag}/> {/each}</div>
			{/if}

		{/if}
	{:else if value.type != "track"}

		<table>
			{#if propertyChanges.length}
				{#each propertyChanges as [removed, added]}
					<tr>
						<td class='removed'>{#if removed}- <span title={removed}>{shorten(removed)}</span>{/if}</td>
						<td class='added'>{#if added}+ <span title={added}>{shorten(added)}</span>{/if}</td>
					</tr>
				{/each}
				
			{/if}
		</table>
	{/if}

	
</div>




