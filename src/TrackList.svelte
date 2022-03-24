<script>
	import FilterButton from "./FilterButton.svelte";
	import { createEventDispatcher } from 'svelte';
	import {buildFilterQuery, setUserFlag} from "./helpers.js";
	import Spinner from "./Spinner.svelte";
	import {PERM, hasPerm} from "./authClient.js";

	export let selectedId = "";
	export let filters = {};

	let filterHash = "";
	let songs = [];
	let data = [];
	let pages = 1;
	let page = 0;

	let inResizeMode = -1;
	let prevMouseX = 0;

	let tableContainer = undefined;
	let pinnedRow = undefined;
	let loaded = false;


	async function load(filters)
	{	
		loaded = false;
		
		// handle switching back to page 0 when filters change
		if(JSON.stringify(filters) != filterHash)
		{
			page = 0;
			filterHash = JSON.stringify(filters);
		}

		let query = buildFilterQuery(filters, page, true);
		let response = await (await fetch("/api/view/tracks" + query)).json();
		data = response.rows;
		pages = response.pages;
		loaded = true;
	}

	function incPage()
	{
		page++;
		load(filters);
	}

	function decPage()
	{
		page = Math.max(page-1, 0);
		load(filters);
	}

	$: loadThisThing = load(filters);
	
	const dispatch = createEventDispatcher();

	function openTrack(id)
	{
		dispatch("openTrack", id);
	}

	const RESIZE_MARGIN = 10;


	function isCloseToColBorder(element, clientX)
	{
		let box = element.getBoundingClientRect();
		let closeToLeft = clientX - box.left;
		let closeToRight = clientX - box.right;
		let match = /col(\d*)/.exec(element.className);
		let columnToResize = Number(match ? match[1] : -1);

		return (0 <= closeToLeft && closeToLeft <= RESIZE_MARGIN && columnToResize-1 >= 0) || (-RESIZE_MARGIN <= closeToRight && closeToRight <= 0)
	}

	function colToResize(element, clientX)
	{
		let box = element.getBoundingClientRect();
		let closeToLeft = clientX - box.left;
		let closeToRight = clientX - box.right;

		let adjustment = 0;
		if(0 <= closeToLeft && closeToLeft <= RESIZE_MARGIN){
			adjustment = -1;
		}

		return Number(/col(\d*)/.exec(element.className)[1]) + adjustment;
	}

	function onMouseMove(e)
	{

		if(isCloseToColBorder(e.target, e.clientX))
		{
			document.body.style.cursor = "col-resize";
		}
		else
		{
			document.body.style.cursor = "default";
		}	

		if(inResizeMode >= 0)
		{
			let diff = e.clientX - prevMouseX;

			let root = document.documentElement;
			let colWidthVar = '--col'+ inResizeMode +'-width';
			
			let oldValue = getComputedStyle(root).getPropertyValue(colWidthVar)
			oldValue = Number(oldValue.substring(0,oldValue.length-2));

			let newValue = (oldValue + diff)

			if(newValue > 25)
			{
				root.style.setProperty(colWidthVar, newValue + "px");

				prevMouseX = e.clientX;
			}
		}
	}

	function onMouseLeave(e){
		document.body.style.cursor = "default";
	}

	function onMouseDown(e)
	{
		if(isCloseToColBorder(e.target, e.clientX) && inResizeMode == -1)
		{
			inResizeMode = colToResize(e.target, e.clientX);
			prevMouseX = e.clientX;
		}
		else{
			inResizeMode = -1;
		}
	}

	function onTrackClick(id){
		openTrack(id)
	}

	window.addEventListener("mouseup", function(){

		inResizeMode = -1;
		document.body.style.cursor = "default";
	})

	function adjustTopRowPosition(e)
	{
		//pinnedRow.style.top = tableContainer.scrollTop + "px";
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

	async function inlineChangeUserFlag(e, songId, flag, value)
	{
		e.stopPropagation();
		

		let songRef = undefined

		for(let song of data)
		{
			if(song.id == songId)
			{
				songRef = song;
				break;
			}
		}

		if(songRef[flag] == value){
			value = null;
		}

		setUserFlag(songId, flag, value);
		songRef[flag] = value;
		data = data;
	}

	let columnDefs = [
		{name: "", property: "status", printFn: statusIcon, icon:true},
		{name: "Artist", property: "artist", printFn: combineMulti},
		{name: "Featured Arist", property: "featured_artist", printFn: combineMulti},
		{name: "Title", property: "title", printFn: (x) => x},
		{name: "Album", property: "album", printFn: combineMulti},
		{name: "Refs", property: "pl", printFn: enumText},
		{name: "Genre", property: "genre", printFn: combineMulti},
		{name: "Tags", property: "tag", printFn: combineMulti},
		{name: "Released", property: "release_date", printFn: (x) => x.substring(0,10)}
	]

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
			
	<div><a href="#new" on:click={()=>{openTrack("new")}}>+ Add a track</a></div>
	
	{#if loaded}

		<div class='table-container' on:scroll={adjustTopRowPosition} bind:this={tableContainer}>
			<table>
				<tr class='pinned-row' bind:this={pinnedRow}>

					{#each columnDefs as column,i}
						<th class={"col" + i + (filters[column.property] ? " active" : "")}
							on:mousemove={onMouseMove}
							on:mousedown={onMouseDown}
						>
							{column.name} <FilterButton active={!!filters[column.property]} property={column.property} on:openFilter />
						</th>
					{/each}
				</tr>
				{#each data as song}
					<tr class={song.id == selectedId ? "selected row" : "row"} on:click={(e) => {onTrackClick(song.id)}}>
						{#each columnDefs as column,i}
							<td class={"col" + i}>
								{#if column.icon}
									{#if song[column.property]}<img class='icon' src={column.printFn(song[column.property])} />{/if}
								{:else}
									{column.printFn(song[column.property])}
								{/if}
							</td>
						{/each}
						{#if hasPerm(PERM.USER_FLAGS)}
							<span class='user-flags'>
								<span on:click={(e) => inlineChangeUserFlag(e, song.id, "status",1)}>
									<img class='icon' src="/notes.png" /><span>Heard it</span>
								</span>&nbsp;
								<span on:click={(e) => inlineChangeUserFlag(e, song.id, "status", 2)}>
									<img class='icon' src="/later.png"/><span>Listen Later</span>
								</span>
								<span on:click={(e) => inlineChangeUserFlag(e, song.id, "status", 3)}>
									<img class='icon' src="/rest.png" /><span>Skip</span>
								</span>
								<!--<span on:click={(e) => inlineChangeUserFlag(e, song.id, "fav", !song.fav)}>☆</span>-->
							</span>
						{/if}
					</tr>
				{/each}
			</table>
		</div>

		<div class='pager'>
			<a href="#next" class={'decPage' + (page>0 ? "" : " hidden")} on:click={decPage}>&lt;- Previous</a>
			<span>Page {page+1}/{pages}</span>
			<a href="#previous" class={'incPage' + (page+1<pages ? "" : ' hidden')} on:click={incPage}>Next -></a>
		</div>
	{:else}
		<Spinner />
	{/if}
</div>

<style>

	:root {
		--col0-width: 25px;
		--col1-width: 200px;
		--col2-width: 50px;
		--col3-width: 200px;
		--col4-width: 100px;
		--col5-width: 100px;
		--col6-width: 100px;
		--col7-width: 100px;
		--col8-width: 100px;
	}

	table{
		font-size: 0;
		white-space: nowrap;
	}

	tr{
		border-bottom: solid 1px #888;
	}

	th{
		border-top: solid 1px #888;
	}

	td,th{

		border-right: solid 1px #888;
		font-size: initial;
		min-height: 21px;

		padding: 2px;
		white-space: nowrap;
		overflow: hidden;
  		text-overflow: ellipsis;

  		display: inline-block;
	}

	td img.icon{
		margin: 0;
		vertical-align: middle;
		height: 18px;
		width: 18px;
		position: relative;
		bottom: 2px;
		left: 1px;
	}

	tr{
		display: block;
		position: relative;
	}

	tr:nth-child(odd){
		background-color: #F3F3F3;
	}

	th{
		background-color: #E8E8E8;
		display: inline-block;
	}

	th.active {
		color: blue;
	}

	tr:hover{
		background-color: #b3d9ff;
	}
	
	tr:hover .user-flags
	{
		display: inline;
		position: absolute;
		font-size: 12pt;
		right: 0px;
		background-color: #b3d9ff;
	}

	.frame{
		height: 100%;
		display: flex;
		flex-direction: column;
		padding-left: .5in;
	}

	tr.selected {
		background-color: #66b3ff;
	}

	.col0{
		border-left: solid 1px #888;;
	}

	.col0{ width: var(--col0-width); }
	.col1{ width: var(--col1-width); }
	.col2{ width: var(--col2-width); }
	.col3{ width: var(--col3-width); }
	.col4{ width: var(--col4-width); }
	.col5{ width: var(--col5-width); }
	.col6{ width: var(--col6-width); }
	.col7{ width: var(--col7-width); }
	.col8{ width: var(--col8-width); }

	.pager {text-align: center;}

	.pager a, .pager span
	{
		display: inline-block;
		min-width: 100px;
	}

	.pager .hidden{
		visibility: hidden;
	}


	.table-container
	{
		width: 100%;
		overflow-x: auto;
	}

	.row{cursor: pointer}

	.pinned-row{
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.table-container{
		position: relative;
	}

	.no-margin{
		margin: 0;
	}

	.version
	{
		font-size: 8pt;
		color: red;
	}


	.user-flags{
		display: none;
	}

	img.icon{
		width: 20px;
		height: 20px;
		margin: 2px;
		margin-bottom: 0px;
	}

	.user-flags > span > *
	{
		vertical-align: middle;
	}

</style>

