<script>
	import { createEventDispatcher } from 'svelte';
	import {buildFilterQuery, setUserFlag, plEnumText} from "./helpers.js";
	import Spinner from "./Spinner.svelte";
	import {PERM, hasPerm} from "./authClient.js";
	import Grid from "./Grid.svelte";

	export let selectedId = "";
	export let filters = {};
	export let view = {};

	const dispatch = createEventDispatcher();

	let filterHash = "";
	let songs = [];
	let data = [];
	let page = [0,1];
	let total = 0;
	let tab = 0;

	let queryCache = "";
	let loaded = false;

	async function load(filters)
	{	
		console.log(view.api);
		console.log(filters);

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


		if(view.tabs[tab].filter)
		{
			filters = view.tabs[tab].filter(filters);
		}

		columnDefs = columnDefs;

		let query = buildFilterQuery(filters, view.tabs[tab].sort || [], page[0], true);
		queryCache = query;
		let response = await (await fetch(view.api + query)).json();
		data = response.rows;
		page = [page[0], response.pages];
		total = response.total;
		loaded = true;
	}

	async function requestRandom()
	{
		let newFilters = JSON.parse(JSON.stringify(filters));

		if(view.tabs[tab].filter)
		{
			newFilters = view.tabs[tab].filter(newFilters);
		}

		let query = buildFilterQuery(newFilters, [{asc: "random"}], 0, true);
		let response = await (await fetch(view.api + query)).json();

		if(response.rows[0])
		{
			dispatch("openTrack", response.rows[0].id);
		}
		
	}

	function setTab(no)
	{
		if(tab != no)
		{
			tab = no;
			load({});
		}
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

	function openTrack(e)
	{
		selectedId = e.detail.id;
		dispatch("openTrack", e.detail.id);
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

	let columnDefs = view.tabs[0].columns;

	let rowButtons = [];

	if(view.api == "/api/view/tracks" && hasPerm(PERM.USER_FLAGS))
	{
		rowButtons = [
			["Heard it", "/notes.png"],
			["Listen Later","/later.png"],
			["Skip","/rest.png"]
		]
	}

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

	{#if view.makeTitle}
		<h1>{view.makeTitle()}</h1>
	{:else if view.htmlTitle}
		{@html view.htmlTitle}
	{/if}

	<div class='action-links'>
		{#if view.hasButtonNewTrack}<a href="#new" on:click={()=>{openTrack({detail: {id:"new"}})}}>+ Add a track</a>{/if}
		{#if view.hasButtonRandomTrack}<a href="#random" on:click={requestRandom}><img class='icon' src="/random.svg"/> Random Track</a>{/if}
	</div>

	{#if view.tabs.length > 1}
		<div class='tabs'>
			{#each view.tabs as thisTab,i}
				<span class={tab == i ? "selected": ""} on:click={()=>setTab(i)}>{thisTab.name}</span>
			{/each}
		</div>
	{/if}
	
	{#if loaded}

		<Grid 
			columns={columnDefs}
			data={data}
			page={page}
			total={total}
			selectedId={selectedId}
			rowButtons = {rowButtons}
			on:pagechange={onPageChange} on:rowclick={view.api == "/api/view/albums" ? () => {} : openTrack} on:openFilter
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
		margin-left: 3px;
		cursor: pointer;
		padding: 5px;
		border: solid 1px #888;
		border-bottom: none;
		background-color: #E8E8E8;
	}

	@media only screen and (max-width: 800px){
		.frame {padding-left: 5px}
	}

	h1{
		padding-top: 0px;
		margin: 0px;
	}

	.icon
	{
		width: 15px;
		height: 15px;
	}

	.right {
		float: right;
	}

	.action-links a
	{
		margin-right: 20px;
	}

</style>

