<script>

	import {tagComp} from "./helpers.js";
	import Tag from "./Tag.svelte";
	import Spinner from "./Spinner.svelte";
	import { createEventDispatcher } from 'svelte';
	import {PERM, hasPerm} from "./authClient.js";

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

	function getPreviousEntry(history, index)
	{
		let i = index+1

		while(history[i] && history[i].value)
		{
			if(history[i].value.deleted)
			{
				return {title: "", release_date: "", tags: []};
			}

			if(history[i].value.tags)
			{
				return history[i].value;
			}

			i++
		}

		return {title: "", release_date: "", tags: []};
	}


	async function loadHistory()
	{
		loaded = false;

		if(id == undefined){
			return;
		}
	
		rawHistory = await (await fetch("/api/history/track/" + id)).json();
		let changes = [];

		console.log(rawHistory);

		for(let i=0; i < rawHistory.length; i++)
		{
			let newEntry = rawHistory[i].value;
			let oldEntry = getPreviousEntry(rawHistory,i);

			let delta = {}
			delta.timestamp = rawHistory[i].timestamp;
			delta.name =  rawHistory[i].name
			if(newEntry.deleted)
			{
				delta.deleted = true;
				changes.push(delta);
				continue;
			}

			if(newEntry.hidden != undefined)
			{
				delta.hidden = newEntry.hidden;
				changes.push(delta)
				continue;
			}

			if(newEntry.title != oldEntry.title){
				delta.titleChange = [oldEntry.title, newEntry.title];
			}

			if(newEntry.release_date != oldEntry.release_date){
				delta.releaseDateChange = [oldEntry.release_date, newEntry.release_date];
			}

			delta.tagsAdded = [];
			delta.tagsRemoved = [];
			newEntry.tags.sort(tagComp);
			oldEntry.tags.sort(tagComp);

			for(let tag of newEntry.tags)
			{
				let count = oldEntry.tags.filter(x => tagComp(tag, x) == 0).length;
				if(count == 0){
					delta.tagsAdded.push(tag);
				}
			}

			for(let tag of oldEntry.tags)
			{
				let count = newEntry.tags.filter(x => tagComp(tag, x) == 0).length;
				if(count == 0){
					delta.tagsRemoved.push(tag);
				}
			}

			changes.push(delta);
		}

		history = changes;
		loaded = true;
	}

	loadHistory();

	async function restoreVersion()
	{
		let num = Object.keys(selected)[0];

		let entry = rawHistory[num];

		var data = {
			id: entry.track_id,
			title: entry.value.title,
			release_date: entry.value.release_date,
			tags: entry.value.tags,
			session: sessionStorage.session
		}

		var response = await (await fetch("/api/track", {
			method: "POST",
			headers: {"Content-Type": "text/json"},
			body: JSON.stringify(data)
		})).json();


		dispatch("reloadtrack","");
	}

</script>


{#if loaded}
	{#if history.length}
		
		<div class='frame'>
			{#each history as item,i}

				<div class='history-entry'>
					{#if !item.deleted && item.hidden == undefined}
						<input id={"history-entry-"+i} type="checkbox" style={"visible: " + (item.hidden || item.deleted ? " hidden;" : " visible;")} on:click={select(i)}/>
					{/if}
					<label for={"history-entry-"+i}>{item.name} – {new Date(item.timestamp).toLocaleString()}</label>
				</div>

				{#if item.deleted}
					<div>Track deleted</div>
				{:else if item.hidden != undefined}
					<div>Track {item.hidden ? "hidden" : "unhidden"}</div>
				{:else}

					{#if item.titleChange}<div>Title: <em>{item.titleChange[0]}</em> => <em>{item.titleChange[1]}</em></div>{/if}

					{#if item.releaseDateChange}<div>Released: <em>{item.releaseDateChange[0]}</em> => <em>{item.releaseDateChange[1]}</em></div>{/if}

					{#if item.tagsAdded.length}
						<div>Tags added: {#each item.tagsAdded as aTag}<Tag tag={aTag}/> {/each}</div>
					{/if}

					{#if item.tagsRemoved.length}
						<div>Tags removed: {#each item.tagsRemoved as aTag}<Tag tag={aTag}/>{/each}</div>
					{/if}
				{/if}
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
		font-weight: bold;
		margin-top: 12pt;
		font-size: 14pt;
		position: relative;
	}

	.history-entry input {
		position: absolute;
		left: -20px;
		top: 5px;
	}

	.action-menu{
		position: fixed;
		background-color: white;
		bottom: 0px;
		padding-bottom: 20px;
		height: 30px;
	}
</style>
