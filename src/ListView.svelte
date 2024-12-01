<script>
	import { createEventDispatcher } from 'svelte';
	import {buildFilterQuery, setUserFlag, plEnumText} from "./helpers.js";
	import Spinner from "./Spinner.svelte";
	import {PERM, hasPerm} from "./authClient.js";
	import Grid from "./Grid.svelte";
	import SearchInput from "./SearchInput.svelte";

	export let selectedId = "";
	export let filters = {};
	export let view = {};
	export let viewProperties = {type: "none", id: "", properties: [], derived_properties: []};

	$: pathSlug = window.location.pathname.split("/").slice(1);


	const dispatch = createEventDispatcher();

	let filterHash = "";
	let songs = [];
	let data = [];
	let page = [0,1];
	let total = 0;
	let tab = 0;
	let albumHyperlinks = null;
	let albumPhysicalReleaseOnly = false; // if the album was never available to purchase online

	let queryCache = "";
	let loaded = false;

	$: pathSlug = window.location.pathname.split("/").slice(1);

	async function load(filters)
	{	
		loaded = false;
		
		// handle switching back to page 0 when filters change
		if(JSON.stringify(filters) != filterHash)
		{
			page[0] = 0;
			filterHash = JSON.stringify(filters);
		}

		for(let col of columnDefs)
		{
			if(col.filtered != undefined)
			{
				col.filtered = !!filters[col.property];
			}	
		}

		if(view.tabs[tab].filter)
		{
			filters = view.tabs[tab].filter(filters);
			columnDefs = view.tabs[tab].columns;
		}

		columnDefs = columnDefs;

		if(view.propertiesObjectType)
		{
			fetch(`/api/getObject?type=${view.propertiesObjectType}&id=${pathSlug[1]}`).then(async function(response){

				let obj = await response.json();

				if(obj.status == 400)
					return;

				console.log(obj)

				viewProperties = obj;
			});
		}




		let query = buildFilterQuery(filters, view.tabs[tab].sort || [], page[0], true);
		queryCache = query;
		let response = await (await fetch(view.api + query)).json();
		data = response.rows;
		page = [page[0], response.pages];
		total = response.total;

		if(response.albumHyperlinks)
			albumHyperlinks = response.albumHyperlinks;
		if(response.albumPhysicalReleaseOnly)
			albumPhysicalReleaseOnly = response.albumPhysicalReleaseOnly;

		loaded = true;
	}

	async function requestRandom()
	{
		let newFilters = JSON.parse(JSON.stringify(filters));

		if(view.tabs[tab].filter)
		{
			newFilters = view.tabs[tab].filter(newFilters);
		}

		let query = buildFilterQuery(newFilters, [{asc: "random"}], 0, true);
		let response = await (await fetch(view.api + query)).json();

		if(response.rows[0])
		{
			dispatch("openTrack", response.rows[0].id);
		}
		
	}

	function setTab(no)
	{
		if(tab != no)
		{
			tab = no;
			load(filters);
		}
	}

	function onPageChange(e)
	{
		if(e.detail > page[0])
		{
			page[0]++;
			load(filters);
		}
		else
		{
			page[0] = Math.max(page[0]-1, 0);
			load(filters);
		}

		page = page;
	}

	$: loadThisThing = load(filters);

	function openTrack(e)
	{
		selectedId = e.detail.id;
		dispatch("openTrack", e.detail.id);
	}

	async function changeUserFlag(e)
	{
		let song = e.detail.row;
		let value = e.detail.button+1;

		if(song["status"] == value){
			value = null;
		}

		setUserFlag(song.id, "status", value);
		song.status = value;
		data = data;
	}

	async function addAlbumLink()
	{
		let thisAlbum = view.tabs[0].filter({}).album.include[0];

		let link = prompt("Album hyperlink")
		if(!link)
			return

		let response = await (await fetch("/api/updateProperty", {
			method: "PUT",
			headers: {"Content-Type": "text/json"},
			body: JSON.stringify({
				session: sessionStorage.session,
				type: "album",
				id: thisAlbum,
				is_delete: false,
				property: "hyperlink",
				value: link,
			})
		})).json();

		window.location.reload();
	}

	async function removeAlbumLink(oldLink)
	{
		let thisAlbum = view.tabs[0].filter({}).album.include[0];

		if(!confirm("Are you sure you want to delete this link?"))
			return

		let response = await (await fetch("/api/updateProperty", {
			method: "PUT",
			headers: {"Content-Type": "text/json"},
			body: JSON.stringify({
				session: sessionStorage.session,
				type: "album",
				id: thisAlbum,
				is_delete: true,
				property: "hyperlink",
				value: oldLink,
			})
		})).json();

		window.location.reload();
	}

	async function togglePhysicalRelease()
	{
		let thisAlbum = view.tabs[0].filter({}).album.include[0];

		let response = await (await fetch("/api/updateProperty", {
			method: "PUT",
			headers: {"Content-Type": "text/json"},
			body: JSON.stringify({
				session: sessionStorage.session,
				type: "album",
				id: thisAlbum,
				is_delete: albumPhysicalReleaseOnly,
				property: "physical release only",
				value: "1",
			})
		})).json();
		window.location.reload();
	}

	let columnDefs = view.tabs[0].columns;
	let rowButtons = [];

	if(view.api == "/api/view/tracks" && hasPerm(PERM.USER_FLAGS))
	{
		rowButtons = [
			["Heard it", "/notes.png"],
			["Listen Later","/later.png"],
			["Skip","/rest.png"],
			["Star","/star-unfilled.svg"]
		]
	}

	function prop(viewProperties, name)
	{
		if(!viewProperties.properties) return [];
		let normalPops = viewProperties.properties.filter(x => x[0] == name).map(x => x[1]);
		if(normalPops.length)
			return normalPops
		return viewProperties.derived_properties.filter(x => x[0] == name).map(x => x[1]);
	}

	// on:click={()=>{openTrack(song.id)}}

</script>

<!--div class='tabs'>
	<span>Everything</span>
	<span>My Feed</span>
	<span>For Later</span>
	<span>Viewed</span>
	<span>Not Interested</span>
</div-->

<div class='frame'>

	{#if view.makeTitle}
		<h1>
			{view.makeTitle()}	
		</h1>
	{:else if view.htmlTitle}
		{@html view.htmlTitle}
	{:else if view.title}
		<h1>
			{view.title.replace("{1}", decodeURIComponent(pathSlug[1]))}

			{#if viewProperties}
				{#each ["twitter","bandcamp","youtube","ponyfm","personalsite","applemusic","soundcloud","spotify","bluesky","mastodon"] as site}
					{#if prop(viewProperties, site)[0]}
						<a href={prop(viewProperties, site)[0]}><img class='logo' src={"/logo/"+site+".png"}/></a>
					{/if}
				{/each}
			{/if}

			{#if view.propertiesObjectType && hasPerm(PERM.EDIT_TAG_METADATA)}
				<img class='edit-button' src="/edit-round-line-icon.svg" height="15" on:click={() => dispatch("openObjectEditor", viewProperties)}>
			{/if}
		</h1>
	{/if}

	
	<div class='tag-info'>


		{#if albumHyperlinks}

			{#each albumHyperlinks as link}
				<a href={link}>{link}</a>
				{#if hasPerm(PERM.EDIT_TAG_METADATA)}
					<span on:click={() => removeAlbumLink(link)}>❌</span>
				{/if}
				&nbsp;
			{/each}
			{#if hasPerm(PERM.EDIT_TAG_METADATA)}
				<button on:click={addAlbumLink}>Add Link</button>
			{/if}

			{#if hasPerm(PERM.EDIT_TAG_METADATA)}
				<div class='checkbox-group'>
					<input type='checkbox' id='phyiscal-release-checkbox' bind:checked={albumPhysicalReleaseOnly} on:click={togglePhysicalRelease}/>
					<label for='phyiscal-release-checkbox'>Phyical release only</label>
				</div>
			{:else}
				<span>Physical release only</span>
			{/if}

		{/if}

		{#if prop(viewProperties, "alias")[0]}
			<div>
				<span>Aliases: </span>
				{#each prop(viewProperties, "alias") as alias}
					<a class='link-list-link' href={"/artist/"+encodeURIComponent(alias)}>{alias}</a>
				{/each}
			</div>
		{/if}

		{#if prop(viewProperties, "group member")[0]}
			<div>
				<span>Members: </span>
				{#each prop(viewProperties, "group member") as alias}
					<a class='link-list-link' href={"/artist/"+encodeURIComponent(alias)}>{alias}</a>
				{/each}
			</div>
		{/if}

		{#if prop(viewProperties, "member of")[0]}
			<div>
				<span>Member of: </span>
				{#each prop(viewProperties, "member of") as alias}
					<a class='link-list-link' href={"/artist/"+encodeURIComponent(alias)}>{alias}</a>
				{/each}
			</div>
		{/if}

	</div>
	
	<div class='action-links'>
		{#if view.hasButtonNewTrack}<a href="#new" on:click={()=>{openTrack({detail: {id:"new"}})}}>+ Add a track</a>{/if}
		{#if view.hasButtonRandomTrack}<a href="#random" on:click={requestRandom}><img class='icon' src="/random.svg"/> Random Track</a>{/if}
		{#if view.api == "/api/view/tracks"}<SearchInput />{/if}
	</div>

	{#if view.tabs.length > 1}
		<div class='tabs'>
			{#each view.tabs as thisTab,i}
				<span class={tab == i ? "selected": ""} on:click={()=>setTab(i)}>{thisTab.name}</span>
			{/each}
		</div>
	{/if}
	
	{#if loaded}
		<Grid 
			columns={columnDefs}
			data={data}
			page={page}
			total={total}
			selectedId={selectedId}
			rowButtons = {rowButtons}
			on:pagechange={onPageChange} on:rowclick={view.api == "/api/view/albums" ? () => {} : openTrack} on:openFilter
			on:rowbuttonclick={changeUserFlag}
		/>
		
	{:else}
		<Spinner />
	{/if}
</div>

<style>

	.logo {
		height: 20px;
		margin-right: 2px;
	}

	.frame{
		height: 100%;
		display: flex;
		flex-direction: column;
		padding-left: .5in;
	}

	.tabs{
		margin-top: 10px;
		margin-left: 10px;
	}

	.tabs span.selected
	{
		background-color: white;
		padding-top: 9px;
		padding-left: 15px;
		padding-right: 15px;
	}

	.tag-info {
		margin-bottom: 10px;
	}
	.tag-info button {
		padding: 3px;
	}

	.tabs span
	{
		margin-left: 3px;
		cursor: pointer;
		padding: 5px;
		border: solid 1px #888;
		border-bottom: none;
		background-color: #E8E8E8;
	}

	@media only screen and (max-width: 800px){
		.frame {padding-left: 5px}
	}

	h1{
		padding-top: 0px;
		margin: 0px;
	}

	.link-list-link + .link-list-link:before {
		content: ", ";
	}

	.icon
	{
		width: 15px;
		height: 15px;
	}

	.right {
		float: right;
	}

	.action-links a
	{
		margin-right: 20px;
	}

	.checkbox-group
	{
		display: inline-block;
	}

	.edit-button {
		height: 20px;
		vertical-align: 20%;
		curosr:pointer;
	}

	label {
		display: inline-block;
		cursor: pointer;
	}



</style>

