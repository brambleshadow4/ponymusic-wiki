
<script>
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	export let property = "";
	export let value = "";
	export let ref = null;


	//let LOOKUP_URL = location.protocol + "//" + location.host + ""
	let options = [];

	async function oninput(e)
	{
		value = e.target.value; 

		/*let data = await fetch("/api/tagLookup", {
			method: "POST",
			headers: {"Content-Type": "text/json"},
			body: JSON.stringify({
				property,
				value: textValue,
			})	
		});

		let matches = await data.json();

		if(textValue != "")
		{
			options = matches
		}
		else
		{
			options = [];
		}*/
	}

	async function onkeyup(e)
	{
		if(e.key == "Enter")
		{
			dispatch("valueSet", {property, value});
			property = "";
			value = "";
		}
	}

	function select(item)
	{
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

	.property-box {
		font-size: initial;
		display: inline-block;
		border: solid 1px #808080;
		border-right: none;

		background-color: rgb(244, 244, 244);

		padding: 6.4px;

		border-top-left-radius: 2px;
		border-bottom-left-radius: 2px;
	}

	input {
		margin: 0px;
		font-size: initial;
		border: solid 1px #808080;
		border-radius: 0px;

		border-top-right-radius: 2px;
		border-bottom-right-radius: 2px;
	}

	input:focus
	{
		box-shadow: none;
	}

	.container {
		font-size: 0pt;
	}
	
</style>

<div class="container">
	{#if property}
		<span class='property-box'>{property}</span>
	{/if}
	
	<input 
		id="tag-entry-input"
		type="text" maxlength="255"
		bind:this={ref}
		on:input={oninput} value={value} on:focus={oninput}
		on:keyup={onkeyup}
	/>

	{#if options.length}
		<div class='auto-complete'>
		{#each options as item}
			<div on:click={select(item)}>{item[1]}</div>
		{/each}
		</div>
	{/if}

	
</div>
