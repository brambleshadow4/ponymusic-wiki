
<script>
	export let tag = "";

	export let canRemove = false;

	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	function remove()
	{
		dispatch("remove", tag);
	}

	function lookupTagText(property, value)
	{
		let text = "";
		if(tag.property == "pl")
		{
			switch(tag.value){
				case "2": text = "Obvious Refs"; break;
				case "1": text = "Subtle Refs"; break;
				case "0": text = "No Refs"; break;
			}

			return text;
		}
		if(tag.property == "tag"){
			return tag.text;
		}

		return tag.property + ":" + tag.text;
		
	}	


	function lookupTagStyle(tag)
	{
		switch(tag.property){
			case "pl":
				return "blue";
			case "artist":
			case "featured artist":
				return "indigo";
			case "genre":
				return "tan";
			case "album":
				return "pink";
			case "tag":
				return "green";

		}
		return "";
	}

	$:text = lookupTagText(tag);
	$:tagClass = "tag " + lookupTagStyle(tag);

</script>

<style>
	.tag {
		border: solid 1px gray;
		background-color: #F0F0F0;
		/*line-height: 35px;*/

		margin: 5px;
		padding: 5px;

		white-space:nowrap;
		display: inline-block;
		font-size: 0;

		vertical-align: middle;
	}

	.tagtext{
		max-width: 500px;
		display: inline-block;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 16px;
		vertical-align: middle;
	}

	a{line-height: 35px;}

	.remove-button{
		cursor: pointer;
		font-size: 16px;
		vertical-align: middle;
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

	.pink{
		color: #9852a3;
		background-color: #dec5e2;
		border-color: #cda7d3;
	}
	.green{
		color: #6f8f0e;
		background-color: #d0e29c;
		border-color: #b3cf5d;
	}
</style>

{#if tag.property == "hyperlink"}
	<a href={tag.value}>{tag.value.length > 30 ? tag.value.substring(0,27) + "..." : tag.value}</a> {#if canRemove}<span class='remove-button' on:click={remove}>❌</span>{/if}
{:else}
	<span class={tagClass}><span class="tagtext" title={text}>{text}</span>{#if tag.number}({tag.number}){/if}{#if canRemove}<span class='remove-button' on:click={remove}>❌</span>{/if}</span>
{/if}
