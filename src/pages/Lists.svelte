<script>
	import ListEditor from "../components/ListEditor.svelte";
	import {getMyLists} from "../components/myLists.js";

	import {hasPerm, PERM} from "../authClient.js";
	import {onMount} from "svelte";

	var loaded = false;
	var myLists = [];
	var allLists = [];

	var loadedTab = 0;

	$: starList = myLists.filter(x => x.star != undefined)[0];

	var starListToggle = !!starList;


	onMount(async function(){

		[myLists, allLists] = await Promise.all([
			getMyLists(true),
			fetch("/api/allLists").then((data) => data.json()).then((x) => x.lists)
		]);

		starListToggle = !! myLists.filter(x => x.star != undefined)[0];
		loaded = true;
	});



	function createNewList()
	{
		myLists.push({id: ""});
		myLists = myLists;
	}

	async function updateStarredList()
	{
		if(starListToggle && !starList)
		{
			var newList = {
				id: "",
				star: "1"
			}

			myLists.push(newList);
			myLists = myLists;
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
			
			let k = myLists.indexOf(starList);
			myLists.splice(k, 1);
			myLists = myLists;
			starListToggle = false;
		}
	}

</script>



<div class='tabs'>
	<div class='tabs-background'></div>
	{#each [[0,"Public Lists"],[1,"Your Lists"]] as tab}
		<span><span class={'tab-text '} on:click={() => {loadedTab = tab[0]}}>{tab[1]}</span><span class={'tab' + (loadedTab == tab[0] ? " selected" : "")} ></span></span>
	{/each}
</div>

<div class='main'>

	{#if !loaded}
		<p>loading lists...</p>
	{:else if loadedTab == 0}
		<h1>Lists</h1>

		{#each allLists as list }
			<a class='list-card' href={"/list/" + list.slug}>
				<div><img src={list.owner_avatar} /></div>
				<div>
					<div class='list-name'>{list.name}</div>
					<div>{list.description}</div>
					<div>List by {list.owner_name}</div>
				</div>
			</a>
		{/each}

	{:else if loadedTab == 1}
		{#if hasPerm(PERM.EDIT_LISTS)}
			
			<h1>Your Lists</h1>

			<div>
				<input type='checkbox' id='share-starred' bind:checked={starListToggle} on:change={updateStarredList} /> <label for='share-starred'>Share Your Starred Tracks</label>
			</div>

			{#if starListToggle}
				<ListEditor data={starList}/>
			{/if}

			<h2>Manual Lists</h2>

			{#each myLists.filter(x => x.star == undefined) as list}
				<ListEditor data={list}/>
			{/each}

			<button on:click={createNewList}>Create list</button>
		{:else}
			<p>Sign in to edit your lists!</p>
		{/if}
	{/if}
</div>
<style>
	.list-name {
		font-weight: bold;
		font-size: 14pt;
	}
	.list-card {
		text-decoration: none;
		transition: background-color .3s;
		display: flex;
		padding: 10px;
		border-radius: 5px;
		color: black;
	}
	.list-card img {
		height: 70px;
		width: 70px;
		border-radius: 35px;
		margin-right: 10px;
	}

	.list-card:hover {
		background-color: #e6f7ff;
	}
	.main
	{
		margin: auto;
		padding: 0in .5in;

		display: flex;
		flex-direction: column;
		height: 100%;

		overflow-y: auto;
	}


	label,input {
		display: inline-block;
	}

	button {
		width: 200px;
	}

	.tabs-background {
		width: 100%;
		background-color: #bfbfbf;;
		height: 37px;
		position: absolute;
		top: 0px;
		bottom: 0px;
		left: 0px;
		right: 0px;

		z-index: -3;
	}

	.tabs
	{
		padding-left: 20px;
		padding-top: 5px;
		font-size: 16pt;
		position: relative;
		/*background-color: */
		
	}

	.tab-text{
		cursor: pointer;
		bacgkround-color: white;
	}

	.tabs > span{
		position: relative;
		margin: 0px 15px;
		bacgkround-color: white;
	}

	.tabs .selected.tab{
		border-bottom: 32px solid white;
		border-left: 16px solid transparent;
		border-right: 16px solid transparent;
		z-index: -1;
		
	}

	.tabs .tab{
		border-bottom: 32px solid #E0E0E0;
		border-left: 16px solid transparent;
		border-right: 16px solid transparent;

		height: 0;
		
		box-sizing: border-box;

		position: absolute;
		left: -20px;
		right: -20px;
		top: 0;

		z-index: -2;
	}


</style>