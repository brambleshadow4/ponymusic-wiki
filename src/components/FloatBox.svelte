<script>
	export let target = null;

	import {onMount, createEventDispatcher} from "svelte";

	let dispatch = createEventDispatcher();
	let width = 290;

	$: targetUpdate = setPosition(target);

	function setPosition(target)
	{
		if(box)
		{
			let bounds = target.getBoundingClientRect();
			console.log(bounds)
			box.style.top = bounds.bottom + "px";
			box.style.left = (bounds.right - 290) + "px";
		}
		
		return true;
	}


	var box = null;

	onMount(function(){
		setPosition(target);
	});

</script>
<span bind:this={box} class='floatbox'>
	<slot></slot>
</span>
<span class='shield' on:click={() => dispatch("close",{})}></span>
<style>
	
	.floatbox {
		position: fixed;
		background-color: white;
		border: solid 1px black;

		width: 290px;
		z-index: 1;
	}

	.shield {
		position: fixed;
		top: 0;
		bottom: 0;
		left: 0;
		right: 0;
		background-color: transparent;
	}
</style>