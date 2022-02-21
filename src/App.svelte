<script>
	import TrackEditor from "./TrackEditor.svelte";
	import TrackList from "./TrackList.svelte";
	import FilterPopup from "./FilterPopup.svelte";
	import {buildFilterQuery} from "./helpers.js";
	
	$: path = window.location.pathname;
	$: avatar = "./avatar.svg";


	let tab = 0;
	let signedIn = !!sessionStorage.role;
	let loadedTrackID = "";
	let loadedFilter = "";

	let filters = {};

	if(window.location.search)
	{
		let query = window.location.search.substring(1);

		for (let text of query.split("&"))
		{
			let [param, value] = text.split("=");

			let typ = "include";

			if(param.substring(0,2) == "x_")
			{
				typ = "exclude";
				param = param.substring(2);
			}

			let values = value.replace(/,,/g, "\uE000").split(",").map(x => decodeURIComponent(x).replace(/\uE000/g, ","));

			console.log(values);

			filters[param] = {property: param};
			filters[param][typ] = values;
		}
	}

	function openTrack(event)
	{
		loadedTrackID = event.detail;
	}

	function openFilter(event)
	{
		loadedFilter = event.detail;
	}

	function changeFilter(event)
	{
		loadedFilter = "";
		filters[event.detail.property] = event.detail;

		history.pushState("idk", "", buildFilterQuery(filters));

		filters = filters;
	}


	function debugLogin(e)
	{
		if(e.shiftKey)
		{
			e.preventDefault();
			sessionStorage.role = 1;
			sessionStorage.session = 1;
			localStorage.session = 1;
			location.reload();
			return false;
		}
	}

	async function restoreSession()
	{
		if(localStorage.session && !sessionStorage.session)
		{
			let request = await fetch("/api/login", {
				method: "POST",
				headers: {"Content-Type": "text/json"},
				body: JSON.stringify({
					session: localStorage.session
				})
			});

			let data = await request.json();	

			if(data.status == 200)
			{
				sessionStorage.role = data.role;
				sessionStorage.session = data.session;
				localStorage.session = data.session;
				signedIn = true;
			}
		}
	}

	restoreSession();

</script>

<style>
	nav 
	{
		position: fixed;
		top: 0;
		bottom: 0;
		left: 0;
		width: 300px;

		background-color: #101010;
	}

	nav a
	{
		display: block;
		font-size: 30pt;
		text-align: center;
		color: white;
	}

	nav a:hover
	{
		background-color: #AAAAAA;
		text-decoration: none;
	}

	.main-container
	{
		position: fixed;
		top: 0;
		bottom: 0;
		left: 300px;
		right: 0;
	}

	.main
	{
		margin: auto;
		padding-left: .5in;

		display: flex;
		flex-direction: column;
		height: 100%;
	}


	.shield {
		position: absolute;
		top: 0;
		bottom: 0;
		left:  0;
		right:  0;
		background-color: rgba(128,128,128,.5);
	}

	.sidebar{
		position: fixed;
		right: 0px;
		top: 0px;
		bottom: 0px;

		max-width: calc(100% - .5in);
		width: 800px;		
	}


	.login{
		position: fixed;
		top: 20px;
		right: 20px;

		background-color:  #101010;
		border-radius: 25px;
		display: inline-block;

		height:  50px;
	}

	.login img{
		width: 50px;
		height: 50px;
		border-radius: 25px;
	}

	.login span
	{
		line-height: 50px;
		color: white;
		display: inline-block;
		vertical-align: top;
		padding: 0px 20px;
	}

	.no-margin{
		margin: 0;
	}


</style>


<nav>
	<a href="/about">About</a>
	<a href="/">Tracks</a>
	<a href="/artists">Artists</a>
	<a>Albums</a>
</nav>

<div class='login'>
	{#if !signedIn}<span>Sign in</span>{/if}<img src={avatar} alt="avatar"/>
</div>

<div class='main-container'>

	{#if path.startsWith("/track/")}
		
	{:else if path == "/" || path == ""}
		<TrackList on:openTrack={openTrack} filters={filters} selectedId={loadedTrackID} on:openFilter={openFilter} />

	{:else if path == "/about"}
		
		<div class='main'>
			<h1>About the Pony Music Wiki</h1>
			<p>I'm trying to make it a thing</p>
		</div>
	{/if}


</div>

{#if loadedTrackID}
	<div class='shield' on:click={()=>{openTrack({detail:""})}}></div>

	<div class='sidebar'>

		<TrackEditor id={loadedTrackID} on:close={openTrack} />
	</div>
{/if}

{#if loadedFilter}
	<div class='shield'>
		
		<FilterPopup property={loadedFilter} value={filters[loadedFilter]} on:change={changeFilter}/>
	</div>

{/if}
