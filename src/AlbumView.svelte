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
	let pageTitle = "";

	let loaded = false;

	async function load(filters)
	{	
		

		let albumName = decodeURIComponent(location.pathname.replace("/album/","").trim());

		pageTitle = "Album: " + albumName;

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

		let filterCopy = JSON.parse(JSON.stringify(filters));
		filterCopy.album = {include: [albumName]};

		let query = buildFilterQuery(filterCopy, [{asc: "album_no"}], page[0], true);
		let response = await (await fetch("/api/view/tracks"+ query)).json();

		data = response.rows;
		loaded = true;
	}

	$: loadThisThing = load(filters);
	

	function openTrack(e)
	{
		selectedId = e.detail.id;
		dispatch("openTrack", e.detail.id);
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
		{name: "", width: "25", property: "status", printFn: statusIcon, icon:true, filtered: false},
		{name: "", width: "25", property: "album_no", },
		{name: "Artist", width: "200", property: "artist", filtered: false},
		{name: "Featured Arist", width: "50", property: "featured_artist", filtered: false},
		{name: "Title", width: "200", property: "title", printFn: (x) => x, filtered: false},
		{name: "Refs", width: "100", property: "pl", printFn: enumText, filtered: false},
		{name: "Genre", width: "100", property: "genre",filtered: false},
		{name: "Tags", width: "100", property: "tag", filtered: false},
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

	<h1 class='no-margin'>{pageTitle}</h1>
				
	{#if loaded}

		<Grid 
			columns={columnDefs}
			data={data}
			selectedId={selectedId}
			rowButtons = {rowButtons}
			on:rowclick={openTrack} on:openFilter
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

	h1{
		padding-top: 20px;
	}

</style>

