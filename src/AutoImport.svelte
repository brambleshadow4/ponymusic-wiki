
<h1>Import Tools</h1>

<p>The current approach is the use of a bookmarklet, which is a piece of javascript that you can add to the bookmark bar of your browser. When you click the bookmarklet, it scrapes the page for a few pieces of information, then sends it over to ponymusic.wiki where you can correct any spellings and then add it quickly.</p>


<h2>Bookmarklet</h2>

<textarea bind:this={compiled}></textarea>

<p>It generally isn't a good idea to run code arbitrary code that you don't trust, including bookmarklets (though we kind of do it all the time). </p>

<h3>Source code</h3>
<textarea  rows="10" bind:this={source}>{
`url = encodeURIComponent(window.location);
if(url.indexOf("youtube.com") > -1){
	title = encodeURIComponent(document.getElementsByClassName('title ytd-video-primary-info-renderer')[0].children[0].innerHTML);
	date = encodeURIComponent(document.getElementById('info-strings').getElementsByTagName('yt-formatted-string')[0].innerHTML);
	artist = encodeURIComponent(document.getElementById("text-container").getElementsByTagName('a')[0].innerHTML);
}
if (url.indexOf("bandcamp.com") > -1){
	title = encodeURIComponent(document.getElementsByClassName('trackTitle')[0].innerHTML.trim());
	date = encodeURIComponent(document.getElementsByClassName("tralbum-credits")[0].innerHTML.trim());
	artistSpanLinks = document.getElementsByClassName("albumTitle")[0].getElementsByTagName('a');
	artist = encodeURIComponent(artistSpanLinks[artistSpanLinks.length-1].innerHTML);
}

x = window.open(\`http://localhost:8000/track/new?title=\${title}&date=\${date}&artist=\${artist}&url=\${url}\`,"_blank");`
}</textarea>



<h2>Bookmarklet Tags</h2>

<p>These will be added to the track when you use the bookmarklet</p>

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
	</div>
	<div>
		<button on:click={addTagEntryField("genre")}>+ Genre</button>
		<button on:click={addTagEntryField("album")}>+ Album</button>
		<button on:click={addTagEntryField("tag")}>+ Tag</button>
		<!--<button>+ Remix</button>-->
	</div>

</div>


<h2>YouTube Channels</h2>

<style>
	.expand{
		height: 10em;
	}
</style>

<script>
	import { onMount } from 'svelte';
	import TagEntryInput from "./TagEntryInput.svelte";
	import {tagComp} from "./helpers.js";
	import Tag from "./Tag.svelte";

	let compiled, source, ref, tagProperty, tagValue, tagNumber;

	let enteringTag = false;

	

	let tags = [];

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
</script>