<script>
	import PropertyEditor from "../components/PropertyEditor.svelte";
	import {createEventDispatcher} from "svelte";
	let dispatch = createEventDispatcher();

	let tabProps = [[0, "Edit Artist"],[2,"History"]];
	let mode = 0;

	export let data = {
		type: "none",
		name: "",
		properties: []
	}

	let error = "";

	async function saveChanges()
	{
		console.log('attempting to save changes')
		let response = await fetch("/api/updateObject", {
			method: "PUT",
			headers: {"Content-Type": "text/json"},
			body: JSON.stringify({
				type: data.type,
				id: data.id,
				properties: data.properties,
				session: sessionStorage.session
			})
		});
		let responseObj = await response.json();

		if(responseObj.status == 200)
		{
			dispatch("close")
		}
		if(responseObj.error)
		{
			error = responseObj.error;
		}
	}

</script>
<style>
	.label 
	{
		display: inline-block;
		line-height: 35px;
	}

	.field .label
	{
		vertical-align: top;
		width: .8in;
		text-align: right;
	}

	.field { margin: 6px 0px; }

	.field-value
	{
		display: inline-block;
	}

	.post-tags{
		margin-top: 20px;
	}

	h1{
		margin-top: 0px;
		padding-top: 12pt
	}

	.h1-0{
		margin-bottom: 0;
	}

	h2 {margin-bottom: 5px;}

	input {margin: 0px}

	.main {
		background-color: white;
		padding-left: .5in;

		height: calc(100vh - 33px);

		overflow-y: auto;

		position: relative;
	}

	@media only screen and (max-width: 800px){
		.main {padding-left: 5px}
	}

	button.added {
		background-color: #D4F9D4;
	}

	button.added:active 
	{
		background-color: #C0E5C0;
	}

	.tabs
	{
		padding-left: 20px;
		padding-top: 5px;
		font-size: 16pt;
	}

	.tab-text{
		cursor: pointer;
	}

	.tabs > span{
		position: relative;
		margin: 0px 15px;
	}

	.tabs .selected.tab{
		border-bottom: 32px solid white;
		z-index: -1;
	}

	.remix-blurb {
		margin-bottom: 8pt;
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

	.indent {
		padding-left: .5in;
	}

	#name{
		width: calc(100% - 1.5in);
	}


	.hidden-banner
	{
		background-color: #ffeecc;
		border: solid 1px #ffcc66;
		margin-top: .3in;
		margin-right: .3in;
		padding: 10px;
	}
</style>
<div class='tabs'>
	{#each tabProps as tab}
		<span><span class={'tab-text '} on:click={() => {mode = tab[0]}}>{tab[1]}</span><span class={'tab' + (mode == tab[0] ? " selected" : "")} ></span></span>
	{/each}
</div>

<div class='main'>
	{#if mode == 0}

		<p>&nbsp;</p>

		<PropertyEditor bind:data={data} display="Alternate spelling" property="alternate spelling" allowMultiple={true} />

		<h2>Related artists</h2>


		<p>Some musicians have multiple aliases. To mark these aliases as belonging to the same person, pick one alias as the alias group, and edit each alias so it's in that group.<p>

		<PropertyEditor bind:data={data} display="Alias Group" property="aliasgroup" />


		<p>For bands or other groups which are made up of multiple artists, list their member's aliases here</p>
		<PropertyEditor bind:data={data} display="Group Members" property="group member" allowMultiple={true}  />
		
	
		<h2>Profiles</h2>

		<PropertyEditor bind:data={data} display="Twitter" property="twitter" />
		<PropertyEditor bind:data={data} display="Bandcamp" property="bandcamp" />
		<PropertyEditor bind:data={data} display="YouTube" property="youtube" />
		<PropertyEditor bind:data={data} display="Soundcloud" property="soundcloud" />
		<PropertyEditor bind:data={data} display="Personal Site" property="personalsite" />
		<PropertyEditor bind:data={data} display="Apple Music" property="applemusic" />
		<PropertyEditor bind:data={data} display="Spotify" property="spotify" />
		<PropertyEditor bind:data={data} display="PonyFM" property="ponyfm" />
		<PropertyEditor bind:data={data} display="Blue Sky" property="bluesky" />
		<PropertyEditor bind:data={data} display="Mastodon" property="mastodon" />

		{#if error}
			<p>Error: {error}</p>
		{/if}

		<button on:click={saveChanges}>Save changes</button>
	{:else if mode == 2}
		<p>Todo</p>
	{/if}
</div>
	