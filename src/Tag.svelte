
<script>
	export let tag = {};
	export let count = 0;
	export let canRemove = false;

	$: canRemoveCalc = canRemove && (tag.property != "original artist");
	$: pageLink = getPageLink(tag, canRemoveCalc)


	let linkMenuOpen = false;

	function getPageLink(tag, canRemove)
	{
		if(canRemoveCalc, canRemove)
			return "";

		switch(tag.property)
		{
			case "artist":
			case "featured artist":
			case "original artist":
				return "/artist/" + encodeURIComponent(tag.value);
			case "album":
				return "/album/" + encodeURIComponent(tag.value);
			case "cover":
			case "remix":
				return "/remix/" + tag.value + "-" + encodeURIComponent(tag.text);
			case "tag":
				return "/tag/" + encodeURIComponent(tag.value);
			case "genre":
				return "/genre/" + encodeURIComponent(tag.value);
			case "pl":
				return "/?pl=" + tag.value;
			default:
				return "";
		}
	}

	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	function remove()
	{
		dispatch("remove", tag);
	}

	function lookupTagText(property, value)
	{
		let text = "";
		if(tag.property == "pl")
		{
			switch(tag.value){
				case "2": text = "Obvious Refs"; break;
				case "1": text = "Subtle Refs"; break;
				case "0": text = "No Refs"; break;
			}

			return text;
		}
		if(tag.property == "tag"){
			return (tag.text||tag.value);
		}

		return tag.property + ":" + (tag.text||tag.value);
		
	}	


	function lookupTagStyle(tag)
	{
		switch(tag.property){
			case "pl":
				return "blue";
			case "artist":
			case "featured artist":
			case "original artist":
				return "indigo";
			case "genre":
				return "tan";
			case "album":
				return "pink";
			case "tag":
				return "green";
			case "remix":
			case "cover":
				return "yellow";
		}
		return "";
	}

	var brokenLinkCheckbox = null;
	var altMixCheckbox = null;
	var reuploadCheckbox = null;
	var linkIconEl = null;

	function setHyperlinkProp(directive)
	{
		if(directive == 'altmix' && altMixCheckbox.checked == true)
		{
			reuploadCheckbox.checked = false;
			tag.property = "alt mix hyperlink";
		}

		if(directive == 'reupload' && reuploadCheckbox.checked == true)
		{
			altMixCheckbox.checked = false;
			tag.property = "reupload hyperlink";
		}

		if(!reuploadCheckbox.checked && !altMixCheckbox.checked)
		{
			tag.property = "hyperlink";
		}

		if(directive == 'brokenlink')
		{
			tag.number = tag.number ? undefined : 1;
		}
	}

	let linkMenuClass = "";

	function openLinkOptions()
	{
		linkMenuOpen = true;
		let boundingBox = linkIconEl.getBoundingClientRect();

		if(boundingBox.left + 280 > window.innerWidth)
		{
			linkMenuClass = "left-side";
		}
		else
		{
			
			linkMenuClass = "normal";
		}

	}


	$:text = lookupTagText(tag);
	$:tagClass = "tag " + lookupTagStyle(tag);
</script>

<style>
	.tag {
		border: solid 1px gray;
		background-color: #F0F0F0;
		/*line-height: 35px;*/

		margin: 5px;
		/*padding: 5px;*/

		white-space:nowrap;
		display: inline-block;
		font-size: 0;

		vertical-align: middle;
	}

	.tag span {
		padding: 5px;
	}

	.tag .count {
		font-size: 16px;
		vertical-align: middle;
		padding-left: 10px;
		/*background-color: red;*/
	}

	.tagtext{
		max-width: 500px;
		display: inline-block;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 16px;
		vertical-align: middle;
	}

	.hyperlinkTag {line-height: 35px;}

	.remove-button{
		cursor: pointer;
		font-size: 16px;
		vertical-align: middle;
	}

	.blue{
		background-color: rgb(193, 215, 228);
		color: rgb(38, 126, 173);
		border-color: rgb(157, 193, 212);
	}
	.blue .count {
		background-color: rgb(157, 193, 212);
	}

	.indigo{
		color: rgb(57, 63, 133);
		background-color: rgb(185, 188, 225);
		border-color: rgb(149, 154, 209);
	}
	.indigo .count {
		background-color: rgb(149, 154, 209);
	}

	.tan{
		color: rgb(139, 85, 47);
		background-color: rgb(230, 201, 181);
		border-color: rgb(205, 148, 108);
	}
	.tan .count {
		background-color: rgb(205, 148, 108);
	}

	.pink{
		color: #9852a3;
		background-color: #dec5e2;
		border-color: #cda7d3;
	}
	.pink .count {
		background-color: #cda7d3;
	}


	.green{
		color: #6f8f0e;
		background-color: #d0e29c;
		border-color: #b3cf5d;
	}
	.green .count {
		background-color: #b3cf5d;
	}
	.yellow{
		color: #998e1a;
		background-color: #ede697;
		border-color: #dcce33;
	}
	.yellow .count {
		background-color: #dcce33;
	}

	img {
		width: 20px;
		height: 20px;
		vertical-align: middle;
	}

	.link-menu-container {
		position: relative;
	}

	.link-menu {
		border: solid 1px black;
		display: inline-block;
		padding: 5px;
		position: absolute;
		top: calc(100% + 5px);
		left: 0px;

		width: 280px;
		background-color: white;
		z-index: 3;
	}

	.link-menu.left-side {
		top: calc(100% + 5px);
		right: 0px;
		left: unset;
	}

	.link-menu input {
		height: 100%;
		border: 0px;
	}

	label {
		display: inline-block;
		user-select: none;
	}

	.hyperlinkTag {
		position: relative;
	}

	.hyperlinkTag span {
		position: absolute;
		right: 3px;
		top: 0px;
		color: white;
		z-index: 2;
		background-color: blue;

		font-weight: bold;
		line-height: 20px;
		height: 20px;

		font-size: 8pt;

		padding: 3px 8px;
		border-radius: 5px;
	}

	.hyperlinkTag span.green {
		background-color: green;
	}

	.hyperlinkTag.broken {
		color: red;
	}

	.link-menu-shield {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 1;
	}

	a:hover {
		text-decoration: none;
	}
</style>

{#if tag.property == "hyperlink" || tag.property == "alt mix hyperlink" || tag.property == "reupload hyperlink"}
	<a class={"hyperlinkTag " + (tag.number ? "broken" : "")} href={tag.value}>
		{tag.value.length > 30 ? tag.value.substring(0,45) + "..." : tag.value}
		{#if tag.property == 'alt mix hyperlink'}
			<span class='green'>Alt Mix</span>
		{:else if tag.property == 'reupload hyperlink'}
			<span>Reupload</span>
		{/if}
	</a>
	

	<span class='link-menu-container'><img bind:this={linkIconEl} src={tag.number ? '/broken-link-icon.svg' : '/link-hyperlink-icon.svg'} on:click={() => {if(canRemoveCalc) openLinkOptions();}}/>
		{#if linkMenuOpen}
			<div class={'link-menu ' + linkMenuClass} on:blur={() => linkMenuOpen = false}>
				<div>
					<input bind:this={altMixCheckbox} checked={tag.property == "alt mix hyperlink"} id='alt-mix-checkbox' type='checkbox'  on:change={() => setHyperlinkProp("altmix")}>
					<label for='alt-mix-checkbox'>Instrumental/A Capella/Other Mix</label>
				</div>
				<div>
					<input bind:this={reuploadCheckbox} checked={tag.property == "reupload hyperlink"} id='reupload-checkbox' type='checkbox'  on:change={() => setHyperlinkProp("reupload")}>
					<label for='reupload-checkbox'>Reupload/Archival Source</label>
				</div>
				<div>
					<input bind:this={brokenLinkCheckbox} checked={tag.number == 1} id='broken-link-checkbox' type='checkbox' on:change={() => setHyperlinkProp("brokenlink")}>
					<label for='broken-link-checkbox'>Broken link</label>
				</div>
				
			</div>

		{/if}
	</span>
	{#if linkMenuOpen}
		<div class='link-menu-shield' on:click={()=>{linkMenuOpen = false;}}></div>
	{/if}



	{#if canRemoveCalc}<span class='remove-button' on:click={remove}>❌</span>{/if}
{:else if pageLink}
	<a href={pageLink} class={tagClass}>
		<span class="tagtext" title={text}>{text}</span>
		{#if tag.number}<span class='count'>#{tag.number}</span>{/if}
		{#if count}<span class='count'>{count}</span>{/if}
		{#if canRemoveCalc}<span class='remove-button' on:click={remove}>❌</span>{/if}
	</a>
{:else}
	<span class={tagClass}>
		<span class="tagtext" title={text}>{text}</span>
		{#if tag.number}<span class='count'>#{tag.number}</span>{/if}
		{#if count}<span class='count'>{count}</span>{/if}
		{#if canRemoveCalc}<span class='remove-button' on:click={remove}>❌</span>{/if}
	</span>
	
{/if}
