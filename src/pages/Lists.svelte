<script>
	import ListEditor from "../components/ListEditor.svelte";
	import {hasPerm, PERM} from "../authClient.js";
	import {onMount} from "svelte";

	var loaded = false;
	var allLists = [];

	$: starList = allLists.filter(x => x.star != undefined)[0];

	var starListToggle = !!starList;


	onMount(async function(){

		var resp = await fetch("/api/myLists?session=" + localStorage["session"]);

		var parsedResp = await resp.json();

		if(parsedResp.status == 200)
		{
			allLists = parsedResp.lists.map(flatten);
			starListToggle = !! allLists.filter(x => x.star != undefined)[0];
			loaded = true;
		}
	});

	function flatten(obj)
	{
		var newObj = {};
		newObj.id = obj.id;
		for(let [p,v] of obj.properties)
		{
			if(newObj[p] == undefined)
				newObj[p] = v;
			else if(typeof newObj[p] == "object")
				newObj[p].push(v);
			else
				newObj[p] = [newObj[p], v];
		}
		return newObj;
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

{:else if hasPerm(PERM.EDIT_LISTS)}
		
	<h2>Your Lists</h2>

	<div>
		<input type='checkbox' id='share-starred' bind:checked={starListToggle} on:change={updateStarredList} /> <label for='share-starred'>Share Your Starred Tracks</label>
	</div>

	{#if starListToggle}
		<ListEditor data={starList}/>
	{/if}

{:else}
	<p>Sign in to edit your lists!</p>
{/if}

<style>
	label,input {
		display: inline-block;
	}

</style>