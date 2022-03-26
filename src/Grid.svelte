<script>
	import {createEventDispatcher} from "svelte";
	import FilterButton from "./FilterButton.svelte";

	export let columns = [];
	export let data = [];
	export let page = [0,1];
	export let selectedId = -1;

	export let rowButtons = [];

	const RESIZE_MARGIN = 10;

	let tableContainer = undefined;
	let dispatch = createEventDispatcher();
	let filters = {};

	let inResizeMode = -1;
	let prevMouseX = 0;
	
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

	window.addEventListener("mouseup", function(){

		inResizeMode = -1;
		document.body.style.cursor = "default";
	});


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


</script>
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
	
	tr:hover .row-buttons
	{
		display: inline;
		position: absolute;
		font-size: 12pt;
		right: 0px;
		background-color: #b3d9ff;
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

	.row-buttons{
		display: none;
	}

	img.icon{
		width: 20px;
		height: 20px;
		margin: 2px;
		margin-bottom: 0px;
	}

	.row-buttons > span > *
	{
		vertical-align: middle;
	}

</style>


<div class='table-container' bind:this={tableContainer}>
	<table>
		<tr class='pinned-row'>
			{#each columns as column,i}
				<th class={"col" + i + (filters[column.property] ? " active" : "")}
					on:mousemove={onMouseMove}
					on:mousedown={onMouseDown}
				>
					{column.name}
					{#if column.filtered != undefined}
						<FilterButton active={column.filtered} property={column.property} on:openFilter />
					{/if}
				</th>
			{/each}
		</tr>
		{#each data as song}
			<tr class={song.id == selectedId ? "selected row" : "row"} on:click={(e) => {dispatch("rowclick", song)}}>
				{#each columns as column,i}
					<td class={"col" + i}>
						{#if column.icon}
							{#if song[column.property]}<img class='icon' src={column.printFn(song[column.property])} />{/if}
						{:else}
							{column.printFn(song[column.property])}
						{/if}
					</td>
				{/each}
				{#if rowButtons.length}
					<span class='row-buttons'>
						{#each rowButtons as button, i}
							<span on:click={(e) => {e.stopPropagation(); dispatch("rowbuttonclick", {row: song, button: i})}}>
								<img class='icon' src={button[1]}/><span>{button[0]}</span>
							</span>
						{/each}
						<!--<span on:click={(e) => inlineChangeUserFlag(e, song.id, "fav", !song.fav)}>☆</span>-->
					</span>
				{/if}
			</tr>
		{/each}
	</table>
</div>

<div class='pager'>
	<a href="#next" class={'decPage' + (page[0]>0 ? "" : " hidden")} on:click={() => dispatch("pagechange", page[0]-1)}>&lt;- Previous</a>
	<span>Page {page[0]+1}/{page[1]}</span>
	<a href="#previous" class={'incPage' + (page[0]+1<page[1] ? "" : ' hidden')} on:click={() => dispatch("pagechange", page[0]+1)}>Next -></a>
</div>