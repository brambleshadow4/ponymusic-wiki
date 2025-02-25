<script>

	import {tagComp} from "../helpers.js";
	import Tag from "../Tag.svelte";
	import Spinner from "../Spinner.svelte";
	import { createEventDispatcher } from 'svelte';
	import ObjectDiff from "../components/ObjectDiff.svelte";

	const dispatch = createEventDispatcher();

	export let id = undefined;

	let history = [];
	let selected = {};

	let rawHistory = [];
	let loaded = false;

	$: selectionCount = Object.keys(selected).length;

	function select(i)
	{
		return function()
		{
			if(selected[i]){
				delete selected[i];
			}
			else {
 				selected[i] = true;
			}

			selected = selected;
		}
	}


	async function loadHistory()
	{
		loaded = false;

		if(id == undefined){
			return;
		}
	
		let response = await (await fetch("/api/history?type=artist&id=" + id)).json();
		history = response.rows;
		loaded = true;
	}

	loadHistory();

</script>


{#if loaded}
	{#if history.length}
		
		<div class='frame'>
			{#each history as item,i}
				<div class='history-entry'>
					
					<ObjectDiff value={item} noTitle noIndent />
				</div>
			{/each}

			<div style="height: 1in">&nbsp;</div>
		</div>

	{:else}
		<div>No recorded history.</div>
	{/if}
{:else}
	<Spinner />
{/if}


<style>
	.history-entry{

		margin-top: 12pt;
		font-size: 14pt;
		position: relative;
	}

	.history-entry input {
		position: absolute;
		left: -30px;
		top: 7px;
	}
</style>
