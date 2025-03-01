<script>
	import { createEventDispatcher } from 'svelte';
	import {isYouTubeOffset} from "./helpers.js";
	const dispatch = createEventDispatcher();

	export let property = "";
	export let value = ""; //string or obj
	export let displayText = "";

	export let number = undefined;
	export let ref = null;
	let numberInput = null;

	$: enumMode = ["cover","remix"].indexOf(property) != -1;


	let cool = false; // can open option list
	let inOptionList = false;

	let optionListKeyboardSel = -1;


	//let LOOKUP_URL = location.protocol + "//" + location.host + ""
	let options = [];

	function onKeyDown(e)
	{
		if(e.key == "Enter")
		{
			let text = ref.value.trim();

			if(options[optionListKeyboardSel])
			{
				text = options[optionListKeyboardSel].text;
				value = options[optionListKeyboardSel].value;
			}


			if(!enumMode)
			{
				value = text
			}

			let tag = {property, value, text};

			if(property == 'hyperlink' && isYouTubeOffset(value))
			{
				tag.property = "youtube offset";
			}

			if(!isNaN(number))
			{
				tag.number = number;

				if(number <= 0)
				{
					numberInput.focus();
					return;
				}
			}
	
			dispatch("valueSet", tag);
			property = "";
			value = "";
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

		displayText = e.target.value;

		

		if(!enumMode){
			value = displayText;
		}

		if(displayText == "" || property == "hyperlink"){
			options = [];
			return;
		};


		let data = await fetch("/api/tagAutofill", {
			method: "POST",
			headers: {"Content-Type": "text/json"},
			body: JSON.stringify({
				property,
				value: displayText,
			})	
		});

		let matches = await data.json();

		let uniqueValues = new Set();

		options = [];

		for(let k of matches)
		{
			if(!uniqueValues.has(k.value))
			{
				uniqueValues.add(k.value)
				options.push(k);
			}
			if(options.length >= 15)
				break;
		}

		options = options
	}

	async function onNumberInput(e)
	{
		let directValue = e.target.value;
		while(isNaN(Number(directValue)) && directValue.length)
		{
			directValue = directValue.substring(0,directValue.length-1);
		}

		e.target.value = directValue;

		let numValue = Number(directValue);

		if(!isNaN(numValue))
		{
			number = numValue
		}
	}

	function select(tag)
	{
		inOptionList = false; 

		delete tag.spelling;

		value = tag.value;

		if(tag.property == "album")
		{
			ref.value = tag.text;
			numberInput.focus();
		}
		else
		{
			dispatch("valueSet", tag);
		}

		canOpenOptionList();
	}

	function canOpenOptionList()
	{
		cool = document.activeElement == ref || inOptionList;
	}

</script>
<div class="container">
	{#if property}
		<span class='property-box'>{property}</span>
	{/if}
	
	<input 
		id="tag-entry-input"
		class={isNaN(number) ? "" : "mid"}
		type="text" maxlength="255"
		bind:this={ref}
		on:input={oninput} value={value} on:focus={oninput}
		on:keyup={onkeyup}
		on:keydown={onKeyDown}
		on:blur={canOpenOptionList}
		on:focus={canOpenOptionList}
	/>

	{#if !isNaN(number)}
		<input bind:this={numberInput} class='number' placeholder="no" value={number || ""}
			on:input={onNumberInput}
			on:keydown={onKeyDown}
		/>
	{/if}

	{#if options.length && cool}
		<div class='auto-complete'>
		{#each options as item, i}
			<div on:click={select(item)} on:mousedown={() => { inOptionList = true; }} class={'option ' + (i == optionListKeyboardSel ? "keyboardSelect" : "")}>
				{item.text}
				{#if item.spelling}
					(aka {item.spelling})
				{/if}
			</div>
		{/each}
		</div>
	{/if}
	
</div>



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
		top: 35px;
		left: 0px;
		right: 0px;
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

		border-top-right-radius: 2px;
		border-bottom-right-radius: 2px;
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

	.option {font-size: initial;}

	.option.keyboardSelect, .auto-complete .keyboardSelect:hover
	{
		background-color: #B0B0B0;
	}

	.auto-complete div:hover
	{
		background-color: #D0D0D0;
	}
	
</style>
