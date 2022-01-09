<script>
	
	export let checked = false;
	export let text = "Default text";
	export let width = "";

	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	function toggle()
	{
		checked = !checked;
		dispatch("change", {checked});
	}

</script>

<style>
	span
	{
		border: solid 2px gray;
		cursor: pointer;
		padding: 0px 8px;
		color: gray;
		user-select: none;

		margin: 0px 3px;
		display: inline-block;
		text-align: center;

		box-sizing: border-box;

		line-height: 30px;
	}

	span:hover
	{
		background-color: #F0F0F0;
	}

	span.checked
	{
		background-color: #0074E8;
		color: white;
		border:  solid 2px #0074E8;
	}

</style>


<span on:click={toggle} class={checked ? "checked" : ""} style="width: {width}">{text}</span>




