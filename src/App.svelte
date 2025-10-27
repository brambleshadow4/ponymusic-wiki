<script>
	import TrackEditor from "./TrackEditor.svelte";
	import ArtistEditor from "./pages/ArtistEditor.svelte";
	import ListView from "./ListView.svelte";
	import FilterPopup from "./FilterPopup.svelte";
	import EditList from "./EditList.svelte";
	import PonyRefs from "./PonyRefs.svelte";
	import LoginButton from "./LoginButton.svelte";
	import ImportTools from "./pages/ImportTools.svelte";
	import AlbumImport from "./AlbumImport.svelte";
	import ApiDocumentation from "./pages/ApiDocumentation.svelte"
	import {buildFilterQuery} from "./helpers.js";
	import RadioGroup from "./RadioGroup.svelte";
	import Community from "./pages/Community.svelte";
	import GridImport from "./pages/GridImport.svelte";
	import TagPage from "./pages/Tags.svelte";
	import Spinner from "./Spinner.svelte";
	import ArtistList from "./pages/Artists.svelte";
	import Lists from "./pages/Lists.svelte";
	import {DefaultView, AlbumView, ArtistView, AlbumList, RemixCoverView, TagView, GenreView, ListView as ListListView} from "./Views.js";
	
	$: path = window.location.pathname;
	$: pathSlug = window.location.pathname.split("/").slice(1);

	let mobileLayout = (window.innerWidth < 800);
	let mobileNavOpen = false;

	let tab = 0;
	let loadedTrackID = "";
	let editProperties = null;
	let loadedFilter = "";

	let exportProgress = "0/0";

	let showAllTracks =  Number(localStorage.SHOW_ALL_TRACKS || 0);

	let filters = {};

	let viewProperties = {};

	let discordHandle = (sessionStorage && sessionStorage.discord) || "";


	let isExportReady = false;

	$: isExportReady2 = evalIsExportReady(path)

	async function evalIsExportReady(path){

		isExportReady = false;
		console.log("starting evalIsExportReady");

		if(path != "/export-data")
		{
			return false;
		}

		let response = await fetch(`/export/precheck?t=` + new Date().getTime());
		let data = await response.json();

		if(data.status == 200)
		{
			isExportReady = true;
		}
		else
		{
			exportProgress = data.progress;
			console.log(data);
			isExportReady = false;
			setTimeout(() => evalIsExportReady(path), 1000);
		}

		return true;
	}

	function makePostLoginUpdates()
	{
		discordHandle = (sessionStorage && sessionStorage.discord) || "";
		return discordHandle;
	}

	function loadFilters()
	{
		if(location.search)
		{
			if(location.pathname == "/track/new")
				return; 
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
	}

	loadFilters();

	if(location.pathname.startsWith("/track"))
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

	let previousURL = "/";

	function openTrack(event)
	{
		loadedTrackID = event.detail;

		if(loadedTrackID){
			previousURL = window.location.toString();
			history.replaceState({}, undefined, "/track/" + loadedTrackID);
		}
		else
		{
			history.replaceState({}, undefined, previousURL)
		}
	}

	async function genericOpenCallback(event)
	{
		if(event.detail.type == "track")
		{
			openTrack({detail: event.detail.id});
		}
		if(event.detail.type == "artist")
		{
			let props = event.detail.editProperties;

			if(!props)
			{
				let response = await fetch(`/api/getObject?type=${event.detail.type}&id=${encodeURIComponent(event.detail.id)}`)

				let obj = await response.json();

				if(obj.status == 400)
					return;

				editProperties = obj;
			}
			else
			{
				editProperties = event.detail.editProperties;
			}
		}
	}

	function openObjectEditor(event)
	{
		editProperties = event.detail;
	}

	function openFilter(event)
	{
		loadedFilter = event.detail;
	}

	function changeFilter(event)
	{
		loadedFilter = "";
		filters[event.detail.property] = event.detail;

		history.pushState("", "", buildFilterQuery(filters, []));

		filters = filters;
	}	

	window.addEventListener("resize", ()=>{

		mobileLayout = (window.innerWidth < 800);
	});	

</script>

<style>
	nav 
	{
		position: fixed;
		top: 0;
		bottom: 0;
		left: 0;
		width: 250px;
		background-color: #101010;
		overflow-y: auto;
	}

	.nav-heading {
		color: white;
		font-size: 30pt;
		text-align: center;
		border-bottom: solid 1px white;
		display: block;
		margin: 0px 10px 0px 10px;
	}

	a + .nav-heading {
		margin-top: 20px;
	}

	.navopen {
		background-color: #202020;

		position: fixed;
		top: 40px;
		bottom: 0px;
		left: 0px;
		right: 0px;

		z-index: 2;

		overflow-y: auto;
	}

	nav a, .navopen a
	{
		display: block;
		font-size: 20pt;
		text-align: center;
		color: #d9d9d9;
	}

	nav a:hover, .navopen a:hover
	{
		background-color: #AAAAAA;
		text-decoration: none;
	}

	.main-container
	{
		position: fixed;
		top: 0;
		bottom: 0;
		left: 250px;
		right: 0;
	}

	p, ol, ul, h2 {
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

		width: calc(100% - .5in);
		max-width: 800px;		
	}

	.exportlink {
		padding: 15px;
		margin: 5px;
		display: inline-block;
		transition: background-color .3s;
	}

	.exportlink:hover {
		text-decoration: none;
		background-color: #e6f7ff;

	}

	.exportlink img, .exportlink span {
		vertical-align: middle;
	}

	.discord-invite {
		text-align: center;
		display: block;
		color: white;
		transition: background-color .3s linear;

		background-image: url(/discord.png);
		background-size: 150px;
		background-repeat: no-repeat;
		background-position: 50px -20px;

		height: 100px;
		position: relative;
	}

	.discord-invite:hover {
		background-color: #232a46;
	}



	.discord-invite span {
		display: inline-block;
		margin-top: 55px;
	}

	@media only screen and (max-width: 800px)
	{
		.main-container
		{
			left: 0px;
			top: 40px;
		}

		nav 
		{
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			width: 100%;
			height: 40px;
			color: white;
		}

		nav span {
			line-height: 40px;
			display: inline-block;
			
		}
		nav span {

		}

		.navbar{
			display: flex;
			flex-direction: row;
		}

		.navbar > * {
			flex-grow: 0;
		}

		.navbar .flex-main {
			flex-grow: 1;
		}
	}
</style>



{#if !mobileLayout}
	<nav>
		<span class='nav-heading'>Music</span>
		<a href="/">Tracks</a>
		<a href="/artists">Artists</a>
		<a href="/albums">Albums</a>
		<a href="/tags">Tags</a>
		<a href="/lists">Lists</a>
		<a href="/community">Community</a>
		<span class='nav-heading'>The Wiki</span>
		<a href="/about">About</a>
		<a href="/edits">Recent Edits</a>
		<a href="/export-data">Download the Data</a>
		<a href="/import-tools">Import Tools</a>
		<a href="/album-import">Import Album</a>
		<!--<a href="/grid-import">Bulk Import</a>-->
		<a href="/docs">API Documentation</a>
		
		
		{#if discordHandle}
			<a class='discord-invite' href={discordHandle}>
				<span>Join our discord!</span>
				
			</a>
		{/if}
	</nav>

	<LoginButton display="fixed" on:login={makePostLoginUpdates} />
{/if}

{#if mobileLayout}
	<nav>
		<div class='navbar'>
			<img alt="menu icond" on:click={()=>{mobileNavOpen = !mobileNavOpen}} src="/menu.png" />
			<span class='mobile-top flex-main'>Ponymusic.wiki</span>
			<LoginButton display="inline" on:login={makePostLoginUpdates} />
		</div>
	</nav>

	{#if mobileNavOpen}
	<div class='navopen'>
		<span class='nav-heading'>Music</span>
		<a href="/">Tracks</a>
		<a href="/artists">Artists</a>
		<a href="/albums">Albums</a>
		<a href="/tags">Tags</a>
		<a href="/lists">Lists</a>
		<a href="/community">Community</a>
		<span class='nav-heading'>The Wiki</span>
		<a href="/about">About</a>
		<a href="/edits">Recent Edits</a>
		<a href="/export-data">Download the Data</a>
		<a href="/import-tools">Import Tools</a>
		<a href="/album-import">Import Album</a>
		<!--a href="/grid-import">Bulk Import</a-->
		<a href="/docs">API Documentation</a>
		{#if discordHandle}
			<a href={discordHandle}>Join our discord!</a>
		{/if}
	</div>
	{/if}
{/if}

<div class='main-container'>
	

	{#if pathSlug[0] == "" || pathSlug[0] == "track"}
		<ListView view={DefaultView} on:openTrack={openTrack} filters={filters} selectedId={loadedTrackID} on:openFilter={openFilter} />

	{:else if pathSlug[0] == "artists"}
		<div class='main'>
			<ArtistList />
		</div>
		
	{:else if pathSlug[0] == "albums"}
		<ListView view={AlbumList} filters={filters} selectedId={loadedTrackID} on:openFilter={openFilter} on:openObjectEditor={openObjectEditor} />

	{:else if pathSlug[0] == "album"}
		<ListView view={AlbumView} on:openTrack={openTrack} filters={filters} selectedId={loadedTrackID} on:openFilter={openFilter} />

	{:else if pathSlug[0] == "artist"}
		<ListView view={ArtistView} on:openTrack={openTrack} filters={filters} selectedId={loadedTrackID} on:openFilter={openFilter} on:openObjectEditor={openObjectEditor} bind:viewProperties={viewProperties} />

	{:else if pathSlug[0] == "genre"}
		<ListView view={GenreView} on:openTrack={openTrack} filters={filters} selectedId={loadedTrackID} on:openFilter={openFilter} />
	{:else if pathSlug[0] == "tags"}
		<div class='main'><TagPage /></div>
	{:else if pathSlug[0] == "tag"}
		<ListView view={TagView} on:openTrack={openTrack} filters={filters} selectedId={loadedTrackID} on:openFilter={openFilter} />

	{:else if pathSlug[0] == "remix"}
		<ListView view={RemixCoverView} on:openTrack={openTrack} filters={filters} selectedId={loadedTrackID} on:openFilter={openFilter} />

	{:else if pathSlug[0] == "list"}
		<ListView view={ListListView} on:openTrack={openTrack} filters={filters} selectedId={loadedTrackID} on:openFilter={openFilter} />

	{:else if pathSlug[0] == "lists"}
		<Lists />
		
	{:else if pathSlug[0] == "about"}
		<div class='main'>

			<h1>About the Pony Music Wiki</h1>

			<p>There's hundreds (if not thousands) of musicians out there releasing tons and tons of My Little Pony fan music. With so much creativity in the fandom, not all of it can be given the spotlight, but the least we can do is keep track of it.</p>

			<p>The Pony Music Wiki is designed to be just that—a community database of all pony music known to Equestria. Anypony is allowed to add missing tracks and make corrections to ensure the wiki has the most up-to-date list of music, that way the burden of responsibility never falls on just a single pony. Like Wikipedia, the wiki also comes with tools to quickly revert any bad changes made by accident or malice. The wiki does not host music files but rather links out to the artist's original upload, be it on Bandcamp or YouTube or Soundcloud. This allows the community to create a more complete database without having to upload an artist's song without their permission. If you are looking for a pony website to upload your tracks to, <a href="https://pony.fm">pony.fm</a> or <a href="https://projectvinyl.net/">Project Vinyl</a> might better suit your needs.</p>

			<h2 id="rules-and-guidelines">Rules and Guidelines</h2>

			<p>There are several guidelines to help everypony work together in maintaining this database</p>

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

			<h2>Hidden Tracks</h2>

			<RadioGroup 
				checked={showAllTracks}
				options={["Default Filtering", "View Hidden Tracks"]} 
				on:change={(e) => {localStorage.SHOW_ALL_TRACKS = e.detail}}
				/>

			<p style="margin: 10px 0px;">Tracks and albums may be hidden for the following reasons:</p>
				<ol><li>No link to track or the album (usually because it was released on a physical CD)</li>
				<li>Not related to My Little Pony</li>
				<li>The artist has been ousted from the fandom for extremely bad behavior (e.g. being a nazi, pedophile, etc.)</li></ol>

			<p>These hidden tracks can be viewed by visiting their URLs directly or by turning on this setting</p>

			<PonyRefs />

		</div>
	
	{:else if path=="/edits"}
		<EditList on:open={genericOpenCallback}/>
	{:else if path=="/pony-refs"}
		<div class='main'>
			<PonyRefs />
		</div>
	{:else if path=="/import-tools"}
		<div class='main'>
			<ImportTools />
		</div>
	{:else if path=="/docs"}
		<div class='main'>
			<ApiDocumentation />
		</div>
	{:else if path=="/export-data"}
		<div class='main'>
			<h1>Download the Data</h1>
			<p>Since ponymusicwiki encourages contributions from everyone in the fandom, we offer a full export of all tracks and their metadata. User-based information is not available to download (in the future, we might offer an option to download user data for yourself)</p>
			<p>We currently offer the data in three formats: excel spreadsheet, RDF/TURTLE, and a SQL file which can be imported into a DBMS</p>

			{#if isExportReady && isExportReady2}

				<p>
					<a class='exportlink' href="/export/xlsx">
						<img width="30" src="/icon/excel.svg">
						<span>pmw.xlsx</span>
					</a>
					<a class='exportlink' href="/export/ttl">
						<img width="30" src="/icon/rdf.svg">
						<span>pmw.ttl</span>
					</a>
					<a class='exportlink' href="/export/db">
						<img width="30" src="/icon/database-download.svg">
						<span>pmw.sql</span>
					</a>
					
				</p>

				<p>For nerds who would like to access the database in real time and perform SQL queries, we also have a public, readonly login to the postgres database. Reach out to brambleshadow4 if you'd like to know the username and password</p>
			{:else}
				<p>Generating files... this usually takes around 2 minutes</p>
				<div>
					{#each {length: Number(exportProgress.split("/")[1])} as _, i}
						{#if i < Number(exportProgress.split("/")[0])}█{:else}░{/if}
					{/each}
				</div>
				<Spinner />
			{/if}
		</div>
	{:else if path == "/album-import"}
		<div class='main'><AlbumImport /></div>
	{:else if path == "/grid-import"}
		<div class='main'><GridImport /></div>
	{:else if path == "/community"}
		<div class='main'><Community /></div>
	{/if}
</div>

{#if loadedTrackID}
	<div class='shield' on:click={()=>{openTrack({detail:""})}}></div>

	<div class='sidebar'>

		<TrackEditor id={loadedTrackID} on:close={openTrack}/>
	</div>
{/if}

{#if editProperties}
	<div class='shield' on:click={()=>{editProperties = null;}}></div>

		<div class='sidebar'>

			<ArtistEditor data={editProperties} on:close={() => {editProperties = null;}} />
		</div>
	{/if}

{#if loadedFilter}
	<div class='shield'>
		<FilterPopup property={loadedFilter} value={filters[loadedFilter]} on:change={changeFilter}/>
	</div>

{/if}
