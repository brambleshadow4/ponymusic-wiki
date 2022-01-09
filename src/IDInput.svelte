
<script>
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	export let value;


	console.log(value);

	let LOOKUP_URL = location.protocol + "//" + location.host + "/api/autocomplete/artist"
	let options = [];

	async function lookup(e)
	{
		let textValue = e.target.value; 

		let data = await fetch(LOOKUP_URL, {
			method: "POST",
			headers: {"Content-Type": "text/plain"},
			body: e.target.value
		});

		let matches = await data.json();

		if(textValue != "")
		{
			options = matches
		}
		else
		{
			options = [];
		}
	}

	function select(item)
	{
		return function()
		{
			options = [];
			value = item;

			dispatch("change", item);
		}
	}

</script>

<style>
	.container
	{
		position: relative;
		display: inline-block;
	}

	.auto-complete
	{
		position: absolute;
		top: 35px;
		left: 0px;
		right: 0px;
	}

	.auto-complete div
	{
		background-color: #EFEFEF;
		border-left: solid 1px #AAA;
		border-right: solid 1px #AAA;
		border-bottom: solid 1px #AAA;
		line-height: 30px;
	}

	.auto-complete div:hover
	{
		background-color: #EFAAAA;
	}

	input { margin: 0px;}
	
</style>

<div class="container">
	<input type="text" maxlength="255" placeholder="Search artists" 
		on:input={lookup} value={value[1]} on:focus={lookup}/>

	{#if options.length}
		<div class='auto-complete'>
		{#each options as item}
			<div on:click={select(item)}>{item[1]}</div>
		{/each}
		</div>
	{/if}

	
</div>
