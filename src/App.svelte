<script>
	import TrackEditor from "./TrackEditor.svelte";
	import TrackList from "./TrackList.svelte";
	
	$: path = window.location.pathname;
	$: avatar = "./avatar.svg";

	let loadedTrackID = "";

	function openTrack(event){

		loadedTrackID = event.detail;
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
		
		max-width: calc(100% - .5in);
		width: 800px;

		padding-left: .5in;
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
</style>


<nav>
	<a href="/">Home</a>
	<a href="/tracks">T<span on:click={debugLogin}>r</span>acks</a>
	<a href="/artists">Artists</a>
	<a>Albums</a>
</nav>

<div class='login'>
	{#if !sessionStorage.role}<span>Sign in</span>{/if}<img src={avatar} alt="avatar"/>
</div>

<div class='main-container'>

	<div class='main'>
		{#if path.startsWith("/track/")}
			<TrackEditor />

		{:else if path.startsWith("/tracks")}
			
			<TrackList on:openTrack={openTrack} selectedId={loadedTrackID} />

		{:else}
			<h1>Pony Music Wiki</h1>
			<p>Welcome to the pony music wiki. I'm trying to make it a thing</p>
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
