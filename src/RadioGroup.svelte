<script>
	export let options = [];
	export let checked = 0;
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	function getStyle(option)
	{
		if(option.width)
		{
			return "width: " + option.width;
		}
		return "";
	}

	function handleClick(itemNo)
	{
		checked = itemNo;
		dispatch("change", itemNo);
	}

</script>


<div class='control'>
	{#each options as option,i}
		
		<div style={getStyle(option)} class={i == checked ? "radioitem checked" : "radioitem"} on:click={() => handleClick(i)}>
			<span class="checkbox"></span>
			<span>{typeof option == "object" ? option.text : option}</span>
		</div>
		
	{/each}
</div>

<style type="text/css">
	
.control {
	display: inline-block;
}

.radioitem
{
	display: inline-block;
	padding: 0px 7px;
	padding-bottom: 5px;
	cursor: pointer;
	margin-right: 5px;
}

.radioitem span
{
	vertical-align: middle;
	line-height: 18px;
}

.radioitem.checked
{
	background-color: rgb(0, 116, 232);
	color: white;
}

.radioitem:hover
{
	background-color: #E0E0E0;
}

.checkbox
{
	display: inline-block;
	width: 15px;
	height: 15px;
	background-image: url(/icon/radio.svg);
	background-size: 15px;
	

	/*height: 15px;
	border: solid 1px black;
	border-radius: 7.5px;
	vertical-align: middle;
	margin-left: 3px;*/
}

.radioitem.checked .checkbox
{
	/*border: solid 1px white;*/
	background-image: url(/icon/radio-full.svg);
}

.radioitem.checked .checkbox
{
	
}

.radioitem.checked:hover
{
	background-color: rgb(0, 101, 202);;
}


</style>

