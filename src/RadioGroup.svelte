<script>
	export let options = [];
	export let checked = 0;
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	function handleClick(itemNo)
	{
		checked = itemNo;
		dispatch("change", itemNo);
	}

</script>


<div class='control'>
	{#each options as option,i}
		
		<div class={i == checked ? "radioitem checked" : "radioitem"} on:click={() => handleClick(i)}>
			<span class={"checkbox"}></span>
			<span>{option}</span>
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
	padding: 0px 5px;
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
	/*height: 15px;
	border: solid 1px black;
	border-radius: 7.5px;
	vertical-align: middle;
	margin-left: 3px;*/
}

.radioitem.checked .checkbox
{
	/*border: solid 1px white;*/
}

.radioitem.checked .checkbox::before
{
	position: relative;
	bottom: 1px;
	left: 1px;
	content:  "\1F518\0FE0E";
	text-align: center;
	vertical-align: bottom;
}

.radioitem.checked:hover
{
	background-color: rgb(0, 101, 202);;
}


</style>

