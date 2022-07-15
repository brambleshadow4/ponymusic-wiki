<script>
	import { createEventDispatcher } from 'svelte';
	import {buildFilterQuery, setUserFlag, plEnumText, Columns, HeardButtons} from "./helpers.js";
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
	let total = 0;

	let tab=0;

	let artistName = "";

	let loaded = false;

	async function load(filters)
	{	
		console.log("loading artist view")

		artistName = decodeURIComponent(location.pathname.replace("/artist/","").trim());

		pageTitle = "Artist: " + artistName;

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

		if(tab == 0){
			filterCopy.artist = {include: [artistName]};
		}
		else if(tab == 1){
			filterCopy.featured_artist = {include: [artistName]};
		}
		

		let query = buildFilterQuery(filterCopy, [], page[0], true);
		let response = await (await fetch("/api/view/tracks"+ query)).json();

		data = response.rows;
		total = response.total;
		loaded = true;
	}

	$: loadThisThing = load(filters);
	

	function openTrack(e)
	{
		selectedId = e.detail.id;
		dispatch("openTrack", e.detail.id);
	}

	function setTab(no)
	{
		if(tab != no)
		{
			tab = no;
			load({});
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

	function filterArtist(row)
	{
		let allArtists = (row.artist && row.featured_artist ? row.artist + "\x1E" + row.featured_artist : row.artist + row.featured_artist)
		return allArtists.split("\x1E").filter(x => x != artistName);
	}

	let columnDefs = [
		Columns.Status,
		{name: "Collaborators", width: "100", transform: filterArtist, linkTo:"/artist/*"},
		Columns.Title,
		Columns.Album,
		Columns.Refs,
		Columns.Genre,
		Columsn.Tags,
		Columns.Released
	];
	

	// on:click={()=>{openTrack(song.id)}}

</script>



<div class='frame'>

	<h1 class='no-margin'>{pageTitle}</h1>
				
	<div class='tabs'>
		<span class={tab==0 ? "selected": ""} on:click={()=>setTab(0)}>Releases</span>
		<span class={tab==1 ? "selected": ""} on:click={()=>setTab(1)}>Features</span>
	</div>
	{#if loaded}

		<Grid 
			columns={columnDefs}
			data={data}
			total={total}
			selectedId={selectedId}
			rowButtons = {HeardButtons}
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
	@media only screen and (max-width: 800px){
		.frame {padding-left: 5px}
	}

	.no-margin{
		margin: 0;
	}

	.version
	{
		font-size: 8pt;
		color: red;
	}

	.tabs{
		margin-top: 10px;
		margin-left: 10px;
	}

	.tabs span.selected
	{
		background-color: white;
		padding-top: 9px;
		padding-left: 15px;
		padding-right: 15px;
	}

	.tabs span
	{
		cursor: pointer;
		padding: 5px;
		border: solid 1px #888;
		border-bottom: none;
		background-color: #E8E8E8;
	}

	h1{
		padding-top: 0px;
	}

</style>

