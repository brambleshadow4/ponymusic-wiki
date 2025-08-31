<script>
	
	export let options = [];
	export let target = null;
	export let values = [];

	import {onMount, createEventDispatcher} from "svelte";


	let dispatch = createEventDispatcher();
	let width = 290;

	$: targetUpdate = setPosition(target);


	function setPosition(target)
	{
		if(menu)
		{
			let bounds = target.getBoundingClientRect();
			menu.style.top = bounds.bottom + "px";
			menu.style.left = (bounds.right - 290) + "px";
		}
		
		return true;
	}


	var menu = null;

	onMount(function(){

		setPosition(target);
	});

	function onChange(e,option)
	{
		if(e.target.checked)
		{
			values.push(option.value);
		}
		else
		{
			let i = values.indexOf(option.value);
			values.splice(i,1);
		}
		values = values;
	}

</script>
<span bind:this={menu} class='floatcheckboxmenu'>
	{#each options as option}
		<div>
			<input type='checkbox' checked={values.indexOf(option.value) > -1} on:change={(e) => onChange(e,option)}>
			<span class='option'>{option.text}</span>
		</div>
	{/each}
</span>
<span class='shield' on:click={() => dispatch("close",{})}></span>
<style>
	
	.floatcheckboxmenu {
		position: fixed;
		background-color: white;
		border: solid 1px black;

		width: 290px;
		z-index: 1;
	}

	input {
		margin: 5px;
	}

	.option {
		margin-right: 5px;
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