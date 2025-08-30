<script>
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
	}

</script>
<div>
	<label>Name:</label><input maxlength="100" on:input={queueSave} bind:value={data.name} />
	<label>Slug:</label><input maxlength="60" bind:this={slugBox} on:input={formatSlug} on:change={formatSlug} bind:value={data.slug} />
	<label>Description:</label>
	<textarea maxlength="500"  on:input={queueSave} rows=4 bind:value={data.description}></textarea>
	<p class={errorText == "200" ? "error green" : " error red"}>
		{errorText == "200" ? "Saved!" : errorText}&nbsp;
		{#if errorText == "200"}
		<br>
		<a href={"/list/" + data.slug}>ponymusic.wiki/list/{data.slug}</a>
		{/if}
	</p>
	
</div>


<style>

	div {
		background-color: #f1f2f4;
		border-radius: 10px;
		padding-top: 20px;
	}

	label,input {
		display: inline-block;
	}

	label {
		width: 110px;
		padding-left: 10px;
		vertical-align: top;
		line-height: 35px;
	}

	input,textarea {
		width: calc(100% - 150px);
	}
	.error {
		padding-left: 110px;
	}
	.green {
		color: green;
	}
	.red {
		color: red;
	}
</style>