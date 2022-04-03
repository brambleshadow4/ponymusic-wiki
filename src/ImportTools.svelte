
<h1>Import Tools</h1>

<p>The current approach is the use of a bookmarklet, which is a piece of javascript that you can add to the bookmark bar of your browser. When you click the bookmarklet, it scrapes the page for a few pieces of information, then sends it over to ponymusic.wiki where you can correct any spellings and then add it quickly.</p>


<h2>Bookmarklet</h2>

<div><textarea rows="5" bind:this={compiled}></textarea></div>

<p>It generally isn't a good idea to run code arbitrary code that you don't trust, including bookmarklets (though we kind of do it all the time). </p>

<h3>Source code</h3>
<div><textarea  rows="10" bind:this={source}>{
`url = encodeURIComponent(window.location);

if(url.indexOf("youtube.com") > -1){
	title = document.getElementsByClassName('title ytd-video-primary-info-renderer')[0].children[0].innerHTML;
	date = document.getElementById('info-strings').getElementsByTagName('yt-formatted-string')[0].innerHTML;
	artist = document.getElementsByTagName("ytd-video-owner-renderer")[0].getElementsByTagName('a')[1].innerHTML;
}

if (url.indexOf("bandcamp.com") > -1){
	title = document.getElementsByClassName('trackTitle')[0].innerHTML.trim();
	date = document.getElementsByClassName("tralbum-credits")[0].innerHTML.trim();
	artistSpanLinks = document.getElementsByClassName("albumTitle")[0].getElementsByTagName('a');
	artist = artistSpanLinks[artistSpanLinks.length-1].innerHTML;
}
if (url.indexOf("soundcloud.com") > -1) {
	title = document.getElementsByClassName('soundTitle__title')[0].getElementsByTagName('span')[0].innerHTML;
	date = document.getElementsByClassName('relativeTime')[0].dateTime.substr(0,10);
	artist = document.getElementsByClassName('soundTitle__username')[0].getElementsByTagName('a')[0].innerHTML.trim();
}

console.log('got this far');

if(title){
	title = encodeURIComponent(title);
	artist = encodeURIComponent(artist);
	date = encodeURIComponent(date);
	x = window.open(\`https://ponymusic.wiki/track/new?title=\${title}&date=\${date}&artist=\${artist}&url=\${url}\`,"_blank");
}`
}</textarea></div>


<h2>Bookmarklet Tags</h2>

<p>These will be added to the track when you use the bookmarklet. For album tags, the track number will increase automatically when adding a track</p>

<div>		
	{#each tags as tag}
		<Tag canRemove={true} tag={tag} on:remove={removeTag(tag)}/>
	{/each}

	{#if enteringTag}
		<TagEntryInput 
			property={tagProperty}
			value={tagValue}
			number={tagNumber}
			bind:ref
			on:valueSet={onEntry}
		/>
	{/if}			
</div>

<div class='field post-tags'>
	<div>
		<button on:click={addTagEntryField("artist")}>+ Artist</button>
		<button on:click={addTagEntryField("featured artist")}>+ Featured Artist</button>
		<button on:click={addTagEntryField("genre")}>+ Genre</button>
		<button on:click={addTagEntryField("album")}>+ Album</button>
		<button on:click={addTagEntryField("tag")}>+ Tag</button>
	</div>
</div>

<h2>Name Overrides</h2>

<p>Some artists may have different names on their youTube/bandcamp. Adding it here will automatically change its name (or remove the tag if left blank).</p>

<div id='name-override-list'>
	<span style="display:inline-block; width: 2.5in">Arist name</span><span>Replace w/</span>
	{#each nameOverrides as pair}
		<div><input type="text" value={pair[0]} on:input={updateNameOverrides}/><input type="text" value={pair[1]} on:input={updateNameOverrides}/></div>
	{/each}
	<div><input type="text" on:input={updateNameOverrides}/><input type="text" on:input={updateNameOverrides}/></div>
</div>

<h2>Parse Rules</h2>

<p>The youTube/bandcamp title often contains names of artists/genres of the track. This setting controls how that information is parsed</p>

<RadioGroup 
	checked={parseRule}
	options={["No Parsing", "<artist1>, <artist2> & <artist3> - Track Title (feat. <featuredArtist>)[<genre>]"]} 
	on:change={(e) => {localStorage.parseRule = e.detail}}
	/>



<h2>YouTube Channels</h2>

<p>TODO, eventually we'll want to have a way of scanning brony youtubers and automatically checking which URLs have been added already and which ones haven't</p>

<style>

	h2 + p, h1 + p, p + h2 {
		margin-top: 0px;
	}

	h2 + p{
		margin-top: 0px;
	}

	textarea{
		width: 100%;
	}
	input {
		margin-right: 3px;
		width: 2.5in;
	}

</style>

<script>
	import { onMount } from 'svelte';
	import TagEntryInput from "./TagEntryInput.svelte";
	import {tagComp} from "./helpers.js";
	import Tag from "./Tag.svelte";
	import RadioGroup from "./RadioGroup.svelte";

	let compiled, source, ref, tagProperty, tagValue, tagNumber;

	let enteringTag = false;
	let tags = [];
	let nameOverrides = [];
	try{
		nameOverrides = JSON.parse(localStorage.nameOverrides);
	}
	catch(e){}

	let parseRule = Number(localStorage.parseRule || 1);
	localStorage.parseRule = parseRule;

	try{
		tags = JSON.parse(localStorage.autoImportTags);
	}
	catch(e){};

	function mount(){

		compiled.value = "javascript:" + source.value.replace(/\n|\t/g, "");
	}

	onMount(mount);

	function addTagEntryField(tagType)
	{
		return function()
		{
			if(ref) {
				ref.value = "";
			}

			tagProperty = tagType;
			tagValue = "";
			tagNumber = tagType == "album" ? 0 : undefined;
			enteringTag = true;
			setTimeout(()=>{ref.focus()}, 10);
		}
	}

	function removeTag(tag)
	{
		return function()
		{
			for(let i=0; i<tags.length; i++)
			{
				if(tags[i].property == tag.property && tags[i].value == tag.value)
				{
					tags.splice(i, 1)
					break;
				}
			}

			tags = tags;
			localStorage.autoImportTags = JSON.stringify(tags);
		}
	}

	function onEntry(e)
	{
		addTag(e.detail)
		enteringTag = false;
	}

	function addTag(tag)
	{
		if(!tag.value){ return; }

		if(tag.property == "pl")
		{
			for(let i=0; i<track.tags.length; i++)
			{
				if(track.tags[i].property == "pl")
				{
					track.tags.splice(i, 1)
					i--;
				}
			}
		}

		tags.push(tag);
		tags.sort(tagComp);

		tags = tags;
		localStorage.autoImportTags = JSON.stringify(tags);
	};

	function updateNameOverrides()
	{
		let inputs = document.getElementById("name-override-list").getElementsByTagName('input');

		let newList = [];
		let focusItem = -1;

		for(let i=0; i<inputs.length; i+= 2)
		{
			let nameInput = inputs[i];
			let replaceInput = inputs[i+1];
			let pair = [nameInput.value, replaceInput.value];
		
	
			if(pair[0])
			{
				newList.push(pair);
			}

			if(document.activeElement == nameInput){
				focusItem = i;
			}
			else if (document.activeElement == replaceInput){
				focusItem = i+1
			}
		}

		nameOverrides = newList;

		localStorage.nameOverrides = JSON.stringify(newList.map(x => [x[0].trim(), x[1].trim()]));

		inputs = document.getElementById("name-override-list").getElementsByTagName('input');

		setTimeout(function(){

			inputs[inputs.length-2].value = "";
			inputs[inputs.length-1].value = "";

			console.log(focusItem)

			if(inputs[focusItem]){
				let x = inputs[focusItem];
				setTimeout(() => x.focus(), 0)
			}
		}, 0)

		

		console.log(nameOverrides);
	}
</script>