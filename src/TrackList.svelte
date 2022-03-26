<script>
	import { createEventDispatcher } from 'svelte';
	import {buildFilterQuery, setUserFlag} from "./helpers.js";
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

		let query = buildFilterQuery(filters, page[0], true);
		let response = await (await fetch("/api/view/tracks" + query)).json();
		data = response.rows;
		page = [page[0], response.pages];
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




	function combineMulti(s)
	{
		if(s == null || s == undefined){
			return "";
		}
		return s.replace(/\x1E/g,", ")
	}

	function enumText(s)
	{
		switch(s)
		{
			case "2": return "Obvious";
			case "1": return "Subtle";
			case "0": return "None";
			default: return "";
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
		{name: "", property: "status", printFn: statusIcon, icon:true, filtered: false},
		{name: "Artist", property: "artist", printFn: combineMulti, filtered: false},
		{name: "Featured Arist", property: "featured_artist", printFn: combineMulti, filtered: false},
		{name: "Title", property: "title", printFn: (x) => x, filtered: false},
		{name: "Album", property: "album", printFn: combineMulti, filtered: false},
		{name: "Refs", property: "pl", printFn: enumText, filtered: false},
		{name: "Genre", property: "genre", printFn: combineMulti,filtered: false},
		{name: "Tags", property: "tag", printFn: combineMulti, filtered: false},
		{name: "Released", property: "release_date", printFn: (x) => x.substring(0,10), filtered: false}
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

