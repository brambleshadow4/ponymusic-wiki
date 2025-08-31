<script>
	import ListEditor from "../components/ListEditor.svelte";
	import {getMyLists} from "../components/myLists.js";

	import {hasPerm, PERM} from "../authClient.js";
	import {onMount} from "svelte";

	var loaded = false;
	var allLists = [];

	$: starList = allLists.filter(x => x.star != undefined)[0];

	var starListToggle = !!starList;


	onMount(async function(){

		allLists = await getMyLists(true);
		starListToggle = !! allLists.filter(x => x.star != undefined)[0];
		loaded = true;

	});



	function createNewList()
	{
		allLists.push({id: ""});
		allLists = allLists;
	}

	async function updateStarredList()
	{
		if(starListToggle && !starList)
		{
			var newList = {
				id: "",
				star: "1"
			}

			allLists.push(newList);
			allLists = allLists;
		}
		if(!starListToggle && starList)
		{
			var response = await (await fetch("/api/updateList", 
			{
				method: "DELETE",
				headers: {"Content-Type": "text/json"},
				body: JSON.stringify({
					id: starList.id,
					session: localStorage.session
				})
			})).json();
			
			let k = allLists.indexOf(starList);
			allLists.splice(k, 1);
			allLists = allLists;
			starListToggle = false;
		}
	}

</script>

{#if !loaded}
	<p>loading lists...</p>
{:else if hasPerm(PERM.EDIT_LISTS)}
		
	<h1>Lists</h1>

	<div>
		<input type='checkbox' id='share-starred' bind:checked={starListToggle} on:change={updateStarredList} /> <label for='share-starred'>Share Your Starred Tracks</label>
	</div>

	{#if starListToggle}
		<ListEditor data={starList}/>
	{/if}

	<h2>Your Lists</h2>

	

	{#each allLists.filter(x => x.star == undefined) as list}
		<ListEditor data={list}/>
	{/each}

	<button on:click={createNewList}>Create list</button>

{:else}
	<p>Sign in to edit your lists!</p>
{/if}

<style>
	label,input {
		display: inline-block;
	}

	button {
		width: 200px;
	}

</style>