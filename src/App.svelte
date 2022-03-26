<script>
	import TrackEditor from "./TrackEditor.svelte";
	import TrackList from "./TrackList.svelte";
	import FilterPopup from "./FilterPopup.svelte";
	import EditList from "./EditList.svelte";
	import PonyRefs from "./PonyRefs.svelte";
	import LoginButton from "./LoginButton.svelte";
	import ImportTools from "./ImportTools.svelte";
	import {buildFilterQuery} from "./helpers.js";
	
	$: path = window.location.pathname;

	let tab = 0;
	let loadedTrackID = "";
	let loadedFilter = "";

	let filters = {};

	if(location.search && (location.pathname == "/" || location.pathname == "/tracks"))
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

			filters[param] = {property: param};
			filters[param][typ] = values;
		}
	}

	if(window.location.pathname.startsWith("/track/"))
	{
		let x = location.pathname.substring("/track/".length);
		if(x == "new")
		{
			loadedTrackID = "new"
		}
		else
		{
			loadedTrackID = isNaN(x) ? "" : Number(x);
		}
	}

	function openTrack(event)
	{
		loadedTrackID = event.detail;

		if(loadedTrackID){
			history.replaceState({}, undefined, "/track/" + loadedTrackID);
		}
		else
		{
			history.replaceState({}, undefined, "/" + buildFilterQuery(filters, 0))
		}
		
	}

	function openFilter(event)
	{
		loadedFilter = event.detail;
	}

	function changeFilter(event)
	{
		loadedFilter = "";
		filters[event.detail.property] = event.detail;

		history.pushState("", "", buildFilterQuery(filters));

		filters = filters;
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

	nav a.smalllink
	{
		font-size: initial;
		color: rgb(0,100,200);;
		text-decoration: underline;
	}

	nav a.smalllink:hover
	{
		background-color: transparent;
	}

	.main-container
	{
		position: fixed;
		top: 0;
		bottom: 0;
		left: 300px;
		right: 0;
	}

	p, ol, ul, h2,h3{
		margin-top: 0px;
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

	.no-margin{
		margin: 0;
	}

	blockquote
	{
		border-left: solid 3px #d6a172;
		background-color: #f5ece4;
		margin: 0px;
		padding-left: .5in;
		padding-top: 10px;
		margin-top: .5in;
	}
</style>


<nav>
	<a href="/about">About</a>
	<a href="/">Tracks</a>
	<a class='smalllink' href="/edits">Recent Edits</a>
	<a class='smalllink' href="/import-tools">Import Tools</a>
</nav>

<LoginButton />

<div class='main-container'>

	{#if path == "/" || path == "" || path.startsWith("/track/")}
		<TrackList on:openTrack={openTrack} filters={filters} selectedId={loadedTrackID} on:openFilter={openFilter} />

	{:else if path == "/about"}
		<div class='main'>

			<blockquote>
				<p>This is basically a design prototype for a potential way of keeping track of pony music. It's far from complete and will likely evolve based on input from the community (which is to say anypony who thinks this is remotely useful).</p>

				<p>Reach out to brambleshadow4 if you'd like to provide design input + feedback.</p>
			</blockquote>

			<h1>About the Pony Music Wiki</h1>

			<p>There's hundreds (if not thousands) of musicians out there releasing tons and tons of My Little Pony fan music. With so much creativity in the fandom, not all of it can be given the spotlight, but the least we can do is keep track of it.</p>

			<p>The Pony Music Wiki is designed to be just that—a community database of all pony music known to Equestria. Anypony is allowed to add missing tracks and make corrections to ensure the wiki has the most up-to-date list of music, that way the burden of responsibility never falls on just a single pony. Like Wikipedia, the wiki also comes with tools to quickly revert any bad changes made by accident or malice. The wiki does not host music files but rather links out to the artist's original upload, be it on Bandcamp or YouTube or Soundcloud. This allows the community to create a more complete database without having to upload an artist's song without their permission. If you are looking for a pony website to upload your tracks to, <a href="https://pony.fm">pony.fm</a> or <a href="https://projectvinyl.net/">Project Vinyl</a> might better suit your needs.</p>


			<h2 id="rules-and-guidelines">Rules and Guidelines</h2>
			<p>There are a few rules to help maintain the peace</p>

			<ol>
				<li>Fuck Nazis. Your music is not welcome. Get out.</li>
				<li>Fuck pedophiles and other sexual predators. Your music is not welcome. Get out.</li>
			</ol>

			<p>There are also several guidelines to help everypony work together in maintaining this database</p>

			<ol>
				<li>This site is for pony music. Anything inspired by My Little Pony source material or the brony fandom counts as pony music. Please do not upload tracks if they are not related to pony
					<ol>
						<li>Exception: If a pony album has a non-pony song on it, the non-pony song is allowed to be listed so the whole album can be in the database</li>
						<li>Exception: If it's not clear if a song is pony inspired or not, you may add it. If it's later deemed not pony, it can be tagged as "Not Pony" to avoid duplicate entries</li>
					</ol>
				</li>
				<li>Double check a song isn't already listed before adding it</li>
				<li>The primary reason to delete a track is if it's a duplicate or it's clearly not a pony song.</li>
				<li>If someone makes a bad edit, assume it's an honest mistake and revert it.</li>
				<li>Guidelines are subject to change as the site evolves</li>

			</ol>

			<h2>Planned New Features, coming soon maybe</h2>

			<ul>
				<li>Publicallly visible lists that only one person can edit</li>
				<li>Mark as watched/watch later/not interested etc.</li>
				<li>Artist view: see the most recent track from each artist to quickly find active musicians</li>
				<li>Tag view: quickly see all the tracks associated with a tag/artist/album/etc</li>
				<li>Actually have tooling for moderators/admins</li>
			</ul>

			<PonyRefs />

		</div>
	
	{:else if path=="/edits"}

		<div class='main'>
			<EditList on:openTrack={openTrack}/>
		</div>

	{:else if path=="/pony-refs"}
		<div class='main'>
			<PonyRefs />
		</div>
	{:else if path=="/import-tools"}
		<div class='main'>
			
			<ImportTools />
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
