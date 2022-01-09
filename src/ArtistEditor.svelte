<script>
	//import IDInput from "./IDInput.svelte"

	let name = "";

	let artistID = window.location.pathname.substring("/artist/".length);

	const EDIT_MODE = 1;
	const NEW_MODE = 2;
	const READ_MODE = 0;

	let mode = artistID == "new" ? 2 : 0;
	let title = mode == NEW_MODE ? "New Artist" : "";


	async function loadData()
	{
		if(mode != NEW_MODE)
		{
			var apiURL = "/api/artist/" + artistID;
			var data = await (await fetch(apiURL)).json();

			if(data.status == 400)
			{
				window.location.href = "/artist/new";
			}

			name = data.name;
			title = "Artist: " + name;
		}
	}

	loadData();

	async function saveData()
	{
		let data = {
			id: artistID,
			name: document.getElementById('name').value
		}

		let response = await fetch("/api/artist/" + artistID, {
			method: "POST",
			headers: {"Content-Type": "text/json"},
			body: JSON.stringify(data)
		});

		let response2 = await response.json();

		if(response2.newId != undefined){
			window.location.href="/artist/" + response2.newId;
		}

		if(response2.status == 200)
		{
			name = data.name;
			title = "Artist: " + name;
			mode = READ_MODE;
		}
	}

	function edit()
	{
		mode = EDIT_MODE;
	}
</script>

<style>
	.label 
	{
		display: inline-block;
		
		text-align: right;

		line-height: 35px;
	}

	.field .label
	{
		vertical-align: top;
	}
</style>


<h1>{title}</h1>

{#if mode != READ_MODE}
	<div>
		<div class='field'>
			<span class="label">Name:</span>
			<input id='name' type="text" maxlength="255" value={name} disabled={mode == READ_MODE}/>
		</div>
	</div>
{/if}

<div>
	{#if mode == NEW_MODE}
		<button on:click={saveData}>Create Artist</button>
	{:else if mode == EDIT_MODE}	
		<button on:click={saveData}>Update</button>
	{:else}
		<button on:click={edit}>Edit</button>
	{/if}
</div>
