<script>
	import RadioGroup from "../RadioGroup.svelte";

	import {onMount} from "svelte";
	import Tag from "../Tag.svelte"


	let tracksMadeOption = 1;
	let timeRangeOption = 0;
	let artistNameOption = 0;

	let artistList = [];

	async function load()
	{

		let query = [];
		if(timeRangeOption)
			query.push("recent=1")

		if(tracksMadeOption)
			query.push("count=" + (tracksMadeOption == 2 ? 25 : 5))

		if(artistNameOption == 27)
			query.push("name=non-alpha");
		else if(artistNameOption)
			query.push("name=" + " abcdefghijklmnopqrstuvwxyz"[artistNameOption]);


		query = "?" + query.join("&")
		console.log(query);

		let response = await (await fetch("/api/view/artists" + query)).json();

		artistList = response.rows;
	}

	onMount(load)

</script>
<style>
	td {
		padding: 10px;
		border-right: solid 3px #AAA;
	}
	table,td,tr {
		border: solid 1px #AAA;
		border-collapse: collapse;
	}

	label {
		font-weight: bold;
		margin-top: 5px;
	}

	aside {
		width: 200px;
		border: solid 1px black;
		padding: 10px;
		background-color: #EEE;
		display: block;
		flex-shrink: 0;

		position: fixed;
		top: 80px;
		right: 25px;

		height: min(505px, calc(100vh - 120px));
		overflow-y: auto;
	}

	.artistlist {
		width: calc(100% - 220px);
	}

	.artist {
		display: inline-block;
		background-color: blue;;
		border-radius: 10px;
		margin: 5px;
	}

	.container {
		display: flex;
	}

	@media only screen and (max-width: 800px){

		aside {
			position: relative;
			top: 0px;
			right: 0px;
			width: 100%;
			height: initial;
		}

	}


</style>
<main>
	<h1>Artists</h1>
	
	<aside>

		<label>Produced their music</label>
		<RadioGroup options={["Any Time", "Within Last 3 Years"]} bind:checked={timeRangeOption} on:change={load} />

		<label>Total tracks made</label>
		<RadioGroup options={["1 or more","5 or more","25 or more"]} bind:checked={tracksMadeOption} on:change={load} />

		<label>Artist Name</label>
		<RadioGroup bind:checked={artistNameOption} on:change={load} options={[
			{text: "All", width: "45px"}, 
			{text: "A", width: "45px"},
			{text: "B", width: "45px"},
			{text: "C", width: "45px"},
			{text: "D", width: "45px"},
			{text: "E", width: "45px"},
			{text: "F", width: "45px"},
			{text: "G", width: "45px"},
			{text: "H", width: "45px"},
			{text: "I", width: "45px"},
			{text: "J", width: "45px"},
			{text: "K", width: "45px"},
			{text: "L", width: "45px"},
			{text: "M", width: "45px"},
			{text: "N", width: "45px"},
			{text: "O", width: "45px"},
			{text: "P", width: "45px"},
			{text: "Q", width: "45px"},
			{text: "R", width: "45px"},
			{text: "S", width: "45px"},
			{text: "T", width: "45px"},
			{text: "U", width: "45px"},
			{text: "V", width: "45px"},
			{text: "W", width: "45px"},
			{text: "X", width: "45px"},
			{text: "Y", width: "45px"},
			{text: "Z", width: "45px"},
			"0-9 and Non-English"]}/>
	</aside>
		
	<div class='artistlist'>
		{#each artistList as artistRow}
			<Tag tag={{property: "artist", value: artistRow.artist}} count={artistRow.count} />
		{/each}

	</div>

</main>