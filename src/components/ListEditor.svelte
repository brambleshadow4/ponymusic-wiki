<script>
	import {getMyLists} from "./myLists.js";
	export var data = {};

	var saveNo = 0;
	var errorText = "";
	var slugBox = null;

	function queueSave()
	{
		errorText = "";
		let k = ++saveNo;
		setTimeout(() => {if(k==saveNo) trySave();}, 400);
	}

	function formatSlug(el)
	{
		slugBox.value = slugBox.value.replace(/[^A-Za-z0-9_]/g,"");
		queueSave();
	}

	async function trySave()
	{
		let body = {
			id: data.id,
			name: data.name,
			description: data.description,
			slug: data.slug,
			session: localStorage.session
		}

		if(data.star)
			body.star = "1";

		var response;
		try
		{
			response = await (await fetch("/api/updateList", 
			{
				method: "PUT",
				headers: {"Content-Type": "text/json"},
				body: JSON.stringify(body)
			})).json();
		}
		catch(e)
		{
			errorText = "Failed to save :(";
			return;
		}
		
		
		if(response.error)
		{
			errorText = response.error;
		}
		else
		{
			errorText = "200";
		}

		if(response.id)
			data.id = response.id;

		await getMyLists(true); // update the cache
	}

	function open()
	{
		if(data.slug)
		{
			window.location = "/list/" + data.slug;
		}
		else
		{
			window.location = "/list/private/" + data.id;
		}
	}

	async function tryDelete()
	{
		if(!confirm("Are you sure you want to delete " + (data.name || "this list") + "?\nYou cannot undo this."))
			return;

		var response = await (await fetch("/api/updateList", 
		{
			method: "DELETE",
			headers: {"Content-Type": "text/json"},
			body: JSON.stringify({
				id: data.id,
				session: localStorage.session
			})
		})).json();

		window.location.reload();
	}

</script>
<div class='list'>
	
	<label>Name:</label><input maxlength="100" on:input={queueSave} bind:value={data.name} />
	<label>Slug:</label>
		<input maxlength="60" bind:this={slugBox} on:input={formatSlug} on:change={formatSlug} 
			bind:value={data.slug} placeholder="Adding a slug will make this list viewable to everypony"/>
	<div class='extra-info'><a href={"/list/" + data.slug}>ponymusic.wiki/list/{data.slug || "<your-slug>"}</a></div>
	<label>Description:</label>
	<textarea maxlength="500"  on:input={queueSave} rows=4 bind:value={data.description}></textarea>
	<div style="margin: 0px; margin-top: 10px;"><button on:click={open}>View</button> <button on:click={tryDelete}>Delete</button> <span class={errorText == "200" ? "error green" : " error red"}>
			{errorText == "200" ? "Saved!" : errorText}&nbsp;
		</span></div>
	
	
</div>


<style>

	.list {
		background-color: #f1f2f4;
		border-radius: 10px;
		padding-top: 20px;
		margin-bottom: 20px;

		padding-left: 10px;
	}

	div {
		margin-bottom: 20px;
	}

	label,input {
		display: inline-block;
	}

	label {
		width: 110px;
		vertical-align: top;
		line-height: 35px;
	}

	.extra-info {
		width: calc(100% - 150px);
		margin-left: 115px;
		padding: 0px;
	}

	input,textarea {
		width: calc(100% - 150px);
	}
	.green {
		color: green;
	}
	.red {
		color: red;
	}
</style>