<script>
	import TrackEditor from "./TrackEditor.svelte";
	import TrackList from "./TrackList.svelte";
	import FilterPopup from "./FilterPopup.svelte";
	import EditList from "./EditList.svelte";
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

		history.pushState("", "", buildFilterQuery(filters));

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

	p, ol, h2{
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
	<a class='smalllink' href="/edits">Recent Edits</a>
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

			<h2 id="pony-references">What are pony references?</h2>

			<p>Pony references are a high level way of classifying how much MLP/brony source material is incorporated into a track. There are three classifications: Obvious Refs, Subtle Refs, and No Refs</p>

			<ul><li>
					Obvious refs is for tracks which make heavy use of source material, likely to the point someone not familiar with My Little Pony could pick up that it's pony related. This includes
					<ul>
						<li>Remixes of show songs</li>
						<li>Songs w/ lyrics directly about MLP or brony culture</li>
						<li>Songs which use extensive chops of clips from the show</li>
					</ul>
					Examples of obvious ref songs include
					<ul>
						<li>Discord by Eurobeat Brony</li>
					</ul>
				</li>
				<li>
					Subtle refs is for tracks which build upon source material, but in a way that people not familiar with MLP would likely not pick up on. Most fans, however, would see the connection.
					<ul>
						<li>Pieces with melodic references to show songs</li>
						<li>Songs with lyrics that fit the pony context without explicilty mentioning names/events/etc. from the show/fandom.</li>
						<li>Obscure chops that aren't easily identified as originanting from the show/fandom</li>
					</ul>
				</li>
				<li>
					No refs is for tracks which don't reference any material from the show/fandom - it is still pony music, but you wouldn't have any way of telling just listening to the track alone
				</li>
			</ul>


		</div>
	
	{:else if path=="/edits"}
		<EditList on:openTrack={openTrack}/>

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
