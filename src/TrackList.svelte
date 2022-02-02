
<script>
	
	export let selectedId = "";

	let songs = [];
	let data = [];

	let inResizeMode = -1;
	let prevMouseX = 0;


	async function load()
	{
		data = await (await fetch("/api/view/tracks")).json();
	}

	load();


	import { createEventDispatcher } from 'svelte';
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

		let columnToResize = Number(element.className.substring(3));

		return (0 <= closeToLeft && closeToLeft <= RESIZE_MARGIN && columnToResize-1 >= 0) || (-RESIZE_MARGIN <= closeToRight && closeToRight <= 0)
	}

	function colToResize(element, clientX)
	{

		let box = element.getBoundingClientRect();
		let closeToLeft = clientX - box.left;
		let closeToRight = clientX - box.right;

		let colClass = element.className.split(" ").filter(x => x.startsWith("col"))[0];
		return Number(colClass.substring(3));
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

		console.log("mouse down")
	}

	function onMouseUp(id, e)
	{
		
		console.log("mouseup")
	}

	function onTrackClick(id){
		openTrack(id)

	}

	window.addEventListener("mouseup", function(){

		inResizeMode = -1;
		document.body.style.cursor = "default";
	})

	// on:click={()=>{openTrack(song.id)}}

</script>


<h1>Tracks</h1>
<a href="#" on:click={()=>{openTrack("new")}}>+ Add a track</a>

<div class='table-container'>
	<table>
		<tr>
			<th class="col0" 
				on:mousemove={onMouseMove}
				on:mousedown={onMouseDown}
				on:onmouseup={onMouseUp}
			>
				Artist <img class='filter' src="./filter.svg" width="15">
			</th>
			<th class="col1"
				on:mousemove={onMouseMove}

				on:mousedown={onMouseDown}
				on:onmouseup={onMouseUp}
			>
				Track <img class='filter' src="./filter.svg" width="15">
			</th>
			<th class="col2"
				on:mousemove={onMouseMove}
		
				on:mousedown={onMouseDown}
				on:onmouseup={onMouseUp}
			>
				Released <img class='filter' src="./filter.svg" width="15">
			</th>
		</tr>
		{#each data as song}
			<tr class={song.id == selectedId ? "selected row" : "row"}>
				<td class="col0" 
					on:click={(e) => {onTrackClick(song.id)}}
				>
					{song.artist.replace(/\x1E/,", ")}
				</td>
				<td class="col1" 
					on:click={(e) => {onTrackClick(song.id)}}
				>
					{song.title} 
				</td>
				<td class="col2" 
					on:click={(e) => {onTrackClick(song.id)}}
				>
					{song.release_date.substring(0,10)}
				</td>
			</tr>
		{/each}
	</table>
</div>
<style>

	:root {
		--col0-width: 200px;
		--col1-width: 200px;
		--col2-width: 100px;
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

	td{
		
	}

	tr{
		display: block;
	}

	tr:nth-child(odd){
		background-color: #F3F3F3;
	}

	th{
		background-color: #E8E8E8;
		display: inline-block;
	}

	tr:hover{
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

	.filter{
		position: relative;
		bottom: -2px;
		cursor: pointer;
	}

	.table-container
	{
		width: 100%;
		overflow-x: auto;
	}

	.row{cursor: pointer}

</style>

