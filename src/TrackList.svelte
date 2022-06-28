<script>
	import { createEventDispatcher } from 'svelte';
	import {buildFilterQuery, setUserFlag, plEnumText} from "./helpers.js";
	import Spinner from "./Spinner.svelte";
	import {PERM, hasPerm} from "./authClient.js";
	import Grid from "./Grid.svelte";

	export let selectedId = "";
	export let filters = {};

	const dispatch = createEventDispatcher();

	let filterHash = "";
	let songs = [];
	let data = [];
	let page = [0,1];
	let total = 0;

	let loaded = false;

	async function load(filters)
	{	
		loaded = false;
		
		// handle switching back to page 0 when filters change
		if(JSON.stringify(filters) != filterHash)
		{
			page[0] = 0;
			filterHash = JSON.stringify(filters);
		}

		for(let col of columnDefs)
		{
			if(col.filtered != undefined)
			{
				col.filtered = !!filters[col.property];
			}
			
		}

		columnDefs = columnDefs;

		let query = buildFilterQuery(filters, [], page[0], true);
		let response = await (await fetch("/api/view/tracks" + query)).json();
		data = response.rows;
		page = [page[0], response.pages];
		total = response.total;
		loaded = true;
	}

	function onPageChange(e)
	{
		if(e.detail > page[0])
		{
			page[0]++;
			load(filters);
		}
		else
		{
			page[0] = Math.max(page[0]-1, 0);
			load(filters);
		}

		page = page;
	}

	$: loadThisThing = load(filters);
	
	


	function openFilter(e)
	{

	}

	function openTrack(e)
	{
		selectedId = e.detail.id;
		dispatch("openTrack", e.detail.id);
	}

	function enumText(s)
	{
		switch(s)
		{
			case "2": return ["Obvious"];
			case "1": return ["Subtle"];
			case "0": return ["None"];
			default: return [""];
		}
	}

	function statusIcon(s)
	{
		switch(s)
		{
			case 3: return "/rest.png";
			case 2: return "/later.png";
			case 1: return "/notes.png";
			default: return "";
		}
	}

	async function changeUserFlag(e)
	{

		let song = e.detail.row;
		let value = e.detail.button+1;

		if(song["status"] == value){
			value = null;
		}

		setUserFlag(song.id, "status", value);
		song.status = value;
		data = data;
	}

	let columnDefs = [
		{name: "", width: "25", property: "status", printFn: statusIcon, icon:true, filtered: false},
		{name: "Artist", width: "200", property: "artist", linkTo:"/artist/*",  filtered: false,},
		{name: "Featured Arist", width: "50", property: "featured_artist", linkTo:"/artist/*", filtered: false},
		{name: "Title", width: "200", property: "title", filtered: false},
		{name: "Album", width: "100", property: "album", linkTo: "/album/*", filtered: false},
		{name: "Refs", width: "100", property: "pl", transform: plEnumText, filtered: false},
		{name: "Genre", width: "100", property: "genre", filtered: false},
		{name: "Tags", width: "100", property: "tag", filtered: false},
		{name: "Released", width: "100", property: "release_date", transform: (x) => [x.substring(0,10)], filtered: false}
	];
	let rowButtons = hasPerm(PERM.USER_FLAGS) ? [
		["Heard it", "/notes.png"],
		["Listen Later","/later.png"],
		["Skip","/rest.png"]
	] : [];

	// on:click={()=>{openTrack(song.id)}}

</script>

<!--div class='tabs'>
	<span>Everything</span>
	<span>My Feed</span>
	<span>For Later</span>
	<span>Viewed</span>
	<span>Not Interested</span>
</div-->

<div class='frame'>

	<h1 class='no-margin'>Pony Music Wiki <span class='version'>(alpha build)</span></h1>
	<div>A community maintained database of pony music.</div>
			
	<div><a href="#new" on:click={()=>{openTrack({detail: {id:"new"}})}}>+ Add a track</a></div>
	
	{#if loaded}

		<Grid 
			columns={columnDefs}
			data={data}
			page={page}
			total={total}
			selectedId={selectedId}
			rowButtons = {rowButtons}
			on:pagechange={onPageChange} on:rowclick={openTrack} on:openFilter
			on:rowbuttonclick={changeUserFlag}
		/>
		
	{:else}
		<Spinner />
	{/if}
</div>

<style>

	.frame{
		height: 100%;
		display: flex;
		flex-direction: column;
		padding-left: .5in;
	}

	.no-margin{
		margin: 0;
	}

	.version
	{
		font-size: 8pt;
		color: red;
	}

</style>

