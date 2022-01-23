<script>
	import TrackEditor from "./TrackEditor.svelte";
	import TrackList from "./TrackList.svelte";
	import TrackView from "./TrackView.svelte";
	
	$: path = window.location.pathname;

	let loadedTrackID = "";

	function openTrack(event){

		loadedTrackID = event.detail;
	}

</script>

<style>
	nav 
	{
		position: fixed;
		top: 0;
		bottom: 0;
		left: 0;
		width: 300px;

		background-color: black;
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
		padding: 8px;
		padding-left: .5in;
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

		background-color: white;
		min-width: 800px;

		padding-left: .5in;
	}


</style>


<nav>
	<a href="/">Home</a>
	<a href="/tracks">Tracks</a>
	<a href="/artists">Artists</a>
	<a>Albums</a>
</nav>

<div class='main-container'>

	<div class='main'>
		{#if path.startsWith("/track/")}
			<TrackEditor />

		{:else if path.startsWith("/tracks")}
			
			<TrackList on:openTrack={openTrack} selectedId={loadedTrackID} />

		{:else}
			<h1>Pony Music Wiki</h1>
			<p>Welcome to the pony music wiki. I'm trying to make it a thing</p>

			<audio controls>
				<source src="http://www.brambleshadow4.net/music/dustcar-29/why can't you just let me be stupid.flac" type="audio/flac" />
			</audio>
		{/if}
	</div>
	
	{#if loadedTrackID}
		<div class='shield' on:click={()=>{openTrack({detail:""})}}></div>
	{/if}


	{#if loadedTrackID}
		<div class='sidebar'>
			<TrackEditor id={loadedTrackID} on:close={openTrack}/>
		</div>
	{/if}

	
</div>



