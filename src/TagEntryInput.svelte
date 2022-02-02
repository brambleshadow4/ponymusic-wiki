
<script>
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	export let property = "";
	export let value = "";
	export let number = undefined;
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

	async function onNumberInput(e)
	{
		let directValue = e.target.value;
		while(isNaN(Number(directValue)) && directValue.length)
		{
			directValue = directValue.substring(0,directValue.length-1);
		}

		e.target.value = directValue;

		let numValue = Number(directValue);

		if(!isNaN(numValue))
		{
			number = numValue
		}
	}

	async function onkeyup(e)
	{
		if(e.key == "Enter")
		{
			let tag = {property, value};

			if(!isNaN(number)){
				tag.number = number;

				if(number <= 0){
					return;
				}
			}

			dispatch("valueSet", tag);
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

	input.mid{
		border-top-right-radius: 0px;
		border-bottom-right-radius: 0px;
		border-right:  none;
	}

	input.number{
		width: .5in;
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
		class={isNaN(number) ? "" : "mid"}
		type="text" maxlength="255"
		bind:this={ref}
		on:input={oninput} value={value} on:focus={oninput}
		on:keyup={onkeyup}
	/>

	{#if !isNaN(number)}
		<input class='number' placeholder="no" value={number || ""}
			on:input={onNumberInput}
			on:keyup={onkeyup}
		/>
	{/if}

	{#if options.length}
		<div class='auto-complete'>
		{#each options as item}
			<div on:click={select(item)}>{item[1]}</div>
		{/each}
		</div>
	{/if}

	
</div>
