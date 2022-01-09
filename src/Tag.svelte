
<script>
	export let property = "";
	export let value = "";

	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	function remove()
	{
		dispatch("remove", {property, value});
	}

	function lookupTagText(property, value)
	{
		let text = "";
		if(property == "pl")
		{
			switch(value){
				case "4": text = "Obviously Pony"; break;
				case "3": text = "Pony"; break;
				case "2": text = "Pony Inpsired"; break;
				case "1": text = "Not Pony"; break;
			}

			return text;
		}

		if(property){
			text = property + ":" + value;
		}
		else{
			text = value
		}

		return text;
	}	

	function lookupTagStyle(property, value)
	{
		switch(property){
			case "pl":
				return "blue";
			case "artist":
			case "featured artist":
				return "indigo";
			case "genre":
				return "tan"

		}
		return "";
	}

	$:text = lookupTagText(property, value);
	$:tagClass = "tag " + lookupTagStyle(property, value);




</script>

<style>
	.tag {
		border: solid 1px gray;
		background-color: #F0F0F0;
		line-height: 35px;

		margin: 5px;
		padding: 5px;
	}

	a{line-height: 35px;}

	.remove-button{
		cursor: pointer;
	}

	.blue{
		background-color: rgb(193, 215, 228);
		color: rgb(38, 126, 173);
		border-color: rgb(157, 193, 212);
	}

	.indigo{
		color: rgb(57, 63, 133);
		background-color: rgb(185, 188, 225);
		border-color: rgb(149, 154, 209);
	}

	.tan{
		color: rgb(139, 85, 47);
		background-color: rgb(230, 201, 181);
		border-color: rgb(205, 148, 108);
	}
</style>

{#if property == "hyperlink"}
	<a href={value}>{value.length > 30 ? value.substring(0,27) + "..." : value}</a> <span class='remove-button' on:click={remove}>❌</span>
{:else}
	<span class={tagClass}>{text} <span class='remove-button' on:click={remove}>❌</span></span>
{/if}
