<script>
	export let value = {};

	import TrackWarnings from "./TrackWarnings.svelte";
	import {onMount} from "svelte";
	import {parseTitle} from "./titleParsing.js";
	import {addTagToTrack} from "./helpers.js";
	import Tag from "./Tag.svelte";

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

</script>

<div>
	<span class='track-title'>{value.title}</span>
	
	<div class='indent'>

		{#if value.tags}
			{#each value.tags as tag}
				<Tag canRemove={false} tag={tag}/>
			{/each}
		{/if}

		<TrackWarnings warnings={warnings} />
	</div>
</div>

<style>
	.track-title {
		font-weight: bold;
	}

	.indent {
		padding-left:.5in;
	}
</style>

