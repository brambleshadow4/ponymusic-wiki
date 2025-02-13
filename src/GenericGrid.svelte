<script>
	import {onMount, createEventDispatcher} from "svelte";
	import FilterButton from "./FilterButton.svelte";

	export let columns = [];
	export let data = [];
	export let selectedId = -1;
	export let total = 0;

	const RESIZE_MARGIN = 10;

	let tableContainer = undefined;
	let dispatch = createEventDispatcher();
	let filters = {};

	let inResizeMode = -1;
	let prevMouseX = 0;

	$: columns, setColumnWidths();
	
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

	function setColumnWidths()
	{
		let root = document.documentElement;
		let styleElement = document.createElement('style');
		document.head.appendChild(styleElement);

		let sheet = styleElement.sheet;

		for(let i=0; i < columns.length; i++)
		{
			let colWidthVar = '--col'+ i +'-width';
			root.style.setProperty(colWidthVar, (columns[i].width || "100") + "px");

			sheet.insertRule(`.col${i}{ width: var(--col${i}-width); }`, i);
		}

	}

	onMount(setColumnWidths)

	function computeCellStyle(cell)
	{
		let style = "";
		if(cell.color)
			style += "color: " + cell.color + ";";
		if(cell.backgroundColor)
			style += "background-color: " + cell.backgroundColor + ";";
		return style;

	}


</script>
<style>

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

	td.deleted
	{
		color: red;
	}

	td.deleted a {
		color: red;
	}

	.col0{
		border-left: solid 1px #888;;
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
</style>


<div class='table-container' bind:this={tableContainer}>
	<table>
		<tr class='pinned-row'>
			{#each columns as column,i}
				<th class={"col" + i + (column.filtered ? " active" : "")}
					on:mousemove={onMouseMove}
					on:mousedown={onMouseDown}
				>
					{column.name}
				</th>
			{/each}
		</tr>
		{#each data as row}
			<tr class={row.id == selectedId ? "selected row" : "row"} on:click={(e) => {dispatch("rowclick", row)}}>
				{#each row as cell,i}
					
					{#if typeof cell == "object"}
						<td class={"col" + i} style={computeCellStyle(cell)} >
							<span >{cell.text}</span>
						</td>
					{:else}
						<td class={"col" + i}>
							<span>{cell}</span>
						</td>
					{/if}
					
				{/each}
			</tr>
		{/each}
	</table>
</div>