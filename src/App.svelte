<script>
	import TrackEditor from "./TrackEditor.svelte";
	import ArtistEditor from "./ArtistEditor.svelte";
	import ArtistList from "./ArtistList.svelte";
	$: path = window.location.pathname;

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
		max-width: 800px;
		margin: auto;
		padding: 8px;
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
		{:else if path.startsWith("/artist/")}
			<ArtistEditor />
		{:else if path.startsWith("/tracks")}
			<h1>Tracks</h1>
			<a href="/track/new">+ Add a track</a>
		{:else if path.startsWith("/artists")}
			<h1>Artists + Musicians</h1>
			<a href="/artist/new">+ Add an Artist</a>
			<ArtistList />
		{:else}
			<h1>Pony Music Wiki</h1>
			<p>Welcome to the pony music wiki. I'm trying to make it a thing</p>
		{/if}
	</div>
	
	
</div>



