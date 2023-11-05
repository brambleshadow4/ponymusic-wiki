<script>
	import TrackWarnings from "./TrackWarnings.svelte";
	import {createEventDispatcher} from "svelte";
	import {parseTitle} from "./titleParsing.js";
	import {addTagToTrack} from "./helpers.js";
	import Tag from "./Tag.svelte";
	import {} from "svelte"

	export let albumInfo = {
		tags: []
	};
	export let no = 0;
	export let value = {tags: []};
	export let releaseDate = "";


	let dispatch = createEventDispatcher();

	$: track = loadTrackInfo(value, albumInfo, no);

	let warnings = {warnings: false};
	let skip = false;


	function loadTrackInfo(trackImport, albumInfo, no)
	{
		let track = {
			title: "",
			scrapedTitle: "",
			tags: []
		};
		let result = parseTitle(trackImport.title);

		addTagToTrack(track, {property: "hyperlink", value: trackImport.url});
		addTagToTrack(track, {property: "album", value: albumInfo.title, text: albumInfo.title, number: no+1})

		for(let tag of result.tags)
		{
			addTagToTrack(track, tag);
		}

		for(let tag of albumInfo.tags)
		{
			addTagToTrack(track, tag);
		}

		for(let tag of trackImport.tags)
		{
			addTagToTrack(track, tag);
		}

		track.scrapedTitle = trackImport.title;
		track.title = result.title;

		dispatch("setTrackData", {track, no, skip})

		getWarnings(track);

		return track;
	}

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

			console.log("warnings done!")

			warnings = response;
		}
		catch(e){

			return null;

		};
	}

	function onEdit(){
		skip = true;
		dispatch("setTrackData", {track, no, skip})
		sessionStorage.merge_data = JSON.stringify({
			id: "new",
			tags: track.tags,
			title: track.title,
			release_date: albumInfo.release_date
		});

		window.open("/track/new", "_blank");
	}

	function mergeTrack(ID)
	{
		skip = true;
		dispatch("setTrackData", {track, no, skip})
		sessionStorage.merge_data = JSON.stringify({
			id: ID,
			tags: track.tags,
			title: track.title,
			release_date: albumInfo.release_date
		});

		window.open("/track/" + ID,"_blank");
	}

</script>

<div>
	<span class='track-title'>{track.title}</span>
	
	<div class='indent'>
		<div><span>{track.scrapedTitle}</span></div>
		{#if track.tags}
			{#each track.tags as tag}
				<Tag canRemove={false} tag={tag}/>
			{/each}
		{/if}

		<TrackWarnings warnings={warnings} on:merge={(e) => mergeTrack(e.detail)}/>
		<div>
			<input 
				type="checkbox" 
				id={"checkbox-"+track.scrapedTitle} 
				bind:checked={skip}
				on:change={() => dispatch("setTrackData", {track, no, skip})}
				/>
			<label for={"checkbox-" + track.scrapedTitle}>Skip import</label> <button on:click={onEdit}>Edit</button>
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

