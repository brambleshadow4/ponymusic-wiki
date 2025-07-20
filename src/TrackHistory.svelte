<script>

	import {tagComp} from "./helpers.js";
	import Tag from "./Tag.svelte";
	import Spinner from "./Spinner.svelte";
	import { createEventDispatcher } from 'svelte';
	import {PERM, hasPerm} from "./authClient.js";
	import ObjectDiff from "./components/ObjectDiff.svelte";

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
	
		let response = await (await fetch("/api/history?type=track&id=" + id)).json();
		history = response.rows;
		loaded = true;
	}

	loadHistory();

	async function restoreVersion()
	{
		console.log(selected)
		let num = Object.keys(selected)[0];

		let entry = history[num];

		var data = {
			id: entry.id,
			title: entry.value.title,
			release_date: entry.value.release_date,
			tags: entry.value.tags,
			session: sessionStorage.session
		}

		console.log(data);

		var response = await (await fetch("/api/track", {
			method: "POST",
			headers: {"Content-Type": "text/json"},
			body: JSON.stringify(data)
		})).json();


		dispatch("reloadtrack","");
	}

	function isVisibilityChange(historyRow)
	{
		return !!historyRow.value.deleted
	}

</script>


{#if loaded}
	{#if history.length}
		
		<div class='frame'>
			{#each history as item,i}

				<div class='history-entry'>
					{#if !isVisibilityChange(item) }
						<input id={"history-entry-"+i} type="checkbox" style={"visible: " + (item.hidden || item.deleted ? " hidden;" : " visible;")} on:click={select(i)}/>
						<ObjectDiff value={item} noTitle noIndent on:click={() => document.getElementById('history-entry-'+i).click()}/>
					{:else}
						<ObjectDiff value={item} noTitle noIndent />
					{/if}

				</div>
			{/each}

			<div style="height: 1in">&nbsp;</div>
		</div>

		<div class='action-menu'>

			{#if selectionCount == 1 && hasPerm(PERM.UPDATE_TRACK)}
				<button on:click={restoreVersion}>Restore This Version</button>
			{:else if selectionCount == 2}
				<button>Compare Versions (TODO)</button>
			{:else}
				Select a version to restore, or select two versions to compare their values
			{/if}
		</div>

	{:else}
		<div>No recorded history for this track</div>
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

	.action-menu{
		position: fixed;
		background-color: white;
		bottom: 0px;
		padding-bottom: 20px;
		height: 30px;
	}
</style>
