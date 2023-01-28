<script>
	export let value = {};
	export let releaseDate = "";

	import TrackWarnings from "./TrackWarnings.svelte";
	import {onMount} from "svelte";
	import {parseTitle} from "./titleParsing.js";
	import {addTagToTrack} from "./helpers.js";
	import Tag from "./Tag.svelte";
	import {} from "svelte"

	let warnings = {warnings: false};

	onMount(async () => {

		let result = parseTitle(value.title);

		value.scrapedTitle = value.title;
		value.title = result.title;
		for(let tag of result.tags)
		{
			addTagToTrack(value, tag);
		}

		addTagToTrack(value, {property: "hyperlink", value: value.url});

		let stuff = await getWarnings(value);
		if(stuff)
		{
			warnings = stuff;
		}

		value = value;

	});

	async function getWarnings(value)
	{
		var data = 
		{
			title: value.title, // nameInput can be undefined during merge
			tags: value.tags,
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

			return response;
		}
		catch(e){

			return null;

		};
	}

	function onEdit(){
		sessionStorage.merge_data = JSON.stringify({
			id: "new",
			tags: value.tags,
			title: value.title,
			release_date: releaseDate
		});

		window.open("/track/new", "_blank");
	}

	function mergeTrack(ID)
	{
		sessionStorage.merge_data = JSON.stringify({
			id: ID,
			tags: value.tags,
			title: value.title,
			release_date: releaseDate
		});

		window.open("/track/" + ID,"_blank");
	}

</script>

<div>
	<span class='track-title'>{value.title}</span>
	
	<div class='indent'>
		<div><span>{value.scrapedTitle}</span></div>
		{#if value.tags}
			{#each value.tags as tag}
				<Tag canRemove={false} tag={tag}/>
			{/each}
		{/if}

		<TrackWarnings warnings={warnings} on:merge={(e) => mergeTrack(e.detail)}/>
		<div>
			<input type="checkbox" id={"checkbox-"+value.scrapedTitle} bind:checked={value.skip}/> <label for={"checkbox-"+value.scrapedTitle}>Skip import</label> <button on:click={onEdit}>Edit</button>
		</div>
	</div>
</div>

<style>
	.track-title {
		font-weight: bold;
	}

	.indent {
		padding-left:.5in;
	}

	label {display: inline-block;}
</style>

