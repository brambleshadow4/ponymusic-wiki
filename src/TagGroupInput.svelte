<script>
	import Tag from "./Tag.svelte";
	import TagEntryInput from "./TagEntryInput.svelte";
	import {createEventDispatcher} from "svelte";
	import {tagComp} from "./helpers.js";

	let dispatch = createEventDispatcher();
	let tagEntryInputControl = null;
	let enteringTag = false;
	let tagProperty = "";
	let tagValue = "";
	let tagNumber = undefined;

	export let value = [];

	function addTagEntryField(tagType)
	{
		return function()
		{
			if(tagEntryInputControl) {
				tagEntryInputControl.value = "";
			}

			tagProperty = tagType;
			tagValue = "";
			tagNumber = tagType == "album" ? 0 : undefined;
			enteringTag = true;
			setTimeout(()=>{tagEntryInputControl.focus()}, 10);
		}
	}

	function removeTag(tag)
	{
		return function()
		{
			for(let i=0; i < value.length; i++)
			{
				if(value[i].property == tag.property && value[i].value == tag.value)
				{
					value.splice(i, 1)
					break;
				}
			}

			value = value;
			dispatch("change");
		}
	}

	function onEntry(e)
	{
		addTag(e.detail)
		enteringTag = false;
		dispatch("change");
	}

	function addTag(tag)
	{
		if(!tag.value){ return; }

		value.push(tag);
		value.sort(tagComp);

		value = value;
		dispatch("change");
	};

</script>

<div>		
	{#each value as tag}
		<Tag canRemove={true} tag={tag} on:remove={removeTag(tag)}/>
	{/each}

	{#if enteringTag}
		<TagEntryInput 
			property={tagProperty}
			value={tagValue}
			number={tagNumber}
			bind:ref={tagEntryInputControl}
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