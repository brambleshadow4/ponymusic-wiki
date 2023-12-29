
<div class="container">

	<input 
		id="tag-entry-input"
		type="text" maxlength="255"
		placeholder="Search artists, albums, ..." 
		bind:this={ref}
		on:input={oninput} value={value}
		on:focus={oninput}
		on:keyup={onkeyup}
		on:keydown={onKeyDown}
		on:blur={canOpenOptionList}
		on:focus={canOpenOptionList}
	/>


	{#if options.length && cool}
		<div class='auto-complete'>
		{#each options as item, i}
			<div on:mousedown={() => {doSearch(item)}} class={'option ' + (i == optionListKeyboardSel ? "keyboardSelect" : "")}>{item.display}</div>
		{/each}
		</div>
	{/if}
	
</div>

<script>
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	export let value = ""; //string or obj
	export let ref = null;


	let cool = false; // can open option list
	let inOptionList = false;

	let optionListKeyboardSel = -1;


	//let LOOKUP_URL = location.protocol + "//" + location.host + ""
	let options = [];

	function doSearch(serachItem)
	{

		let {property, value, id} = serachItem;
		if(property)
		{
			switch(property)
			{
				case "artist": window.location.href = "/artist/" + encodeURIComponent(value); return;
				case "album": window.location.href = "/album/" + encodeURIComponent(value); return;
				case "genre": window.location.href = "/genre/" + encodeURIComponent(value); return;
				case "tag": window.location.href = "/tag/" + encodeURIComponent(value); return;
			}
		}
		else if (id)
		{
			window.location.href = "/track/" + id;
		}
	}

	function onKeyDown(e)
	{
		if(e.key == "Enter")
		{
			doSearch(options[optionListKeyboardSel]);
		}

		if(options.length == 0)
		{
			optionListKeyboardSel = -1;
			return;
		}

		if(e.key == "ArrowDown")
		{
			optionListKeyboardSel = Math.min(options.length-1, optionListKeyboardSel+1);
			e.preventDefault();
		}
		if (e.key == "ArrowUp")
		{
			optionListKeyboardSel = Math.max(0, optionListKeyboardSel-1);
			e.preventDefault();
		}

	}

	async function oninput(e)
	{
		canOpenOptionList();

		let data = await fetch("/api/search?search=" + encodeURIComponent(e.target.value), {
			method: "GET",
			headers: {"Content-Type": "text/json"},	
		});

		let matches = await data.json();
		options = matches;
	}

	function select(tag)
	{
		inOptionList = false; 

		canOpenOptionList();
	}

	function canOpenOptionList()
	{
		cool = document.activeElement == ref || inOptionList;
	}

</script>

<style>
	.container
	{
		position: relative;
		display: inline-block;
		vertical-align: middle;
	}

	.auto-complete
	{
		position: absolute;
		top: 22px;
		left: 0px;
		width: 300px;
		z-index: 2;
	}

	.auto-complete div
	{
		background-color: #EFEFEF;
		border-left: solid 1px #AAA;
		border-right: solid 1px #AAA;
		border-bottom: solid 1px #AAA;
		line-height: 30px;
	}

	

	.property-box {
		font-size: initial;
		display: inline-block;
		border: solid 1px #808080;
		border-right: none;

		background-color: rgb(244, 244, 244);

		padding: 6.4px;

		border-top-left-radius: 2px;
		border-bottom-left-radius: 2px;
	}

	input {
		margin: 0px;
		font-size: initial;
		border: solid 1px #808080;
		border-radius: 0px;

		padding: 0px;

		border-top-right-radius: 2px;
		border-bottom-right-radius: 2px;

		background-image: url("/search-icon.svg");
		background-size: 20px 20px;
		background-repeat: no-repeat;
		background-position: right;
	}

	input.mid{
		border-top-right-radius: 0px;
		border-bottom-right-radius: 0px;
		border-right:  none;
	}

	input.number{
		width: .5in;
	}

	input:focus
	{
		box-shadow: none;
	}

	.container {
		font-size: 0pt;
	}

	.option {
		font-size: initial;

	}

	.option.keyboardSelect, .option.keyboardSelect:hover
	{
		background-color: #B0B0B0;
	}

	.auto-complete div:hover
	{
		background-color: #D0D0D0;
	}

	.icon {
		height: 15px;
		width: 15px;
		position: relative;
		right: 20px;
	}
	
</style>
