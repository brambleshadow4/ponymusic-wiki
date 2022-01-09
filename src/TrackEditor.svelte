<script>
	
	import TagEntryInput from "./TagEntryInput.svelte";
	import Tag from "./Tag.svelte";


	let tags = [];
	let enteringTag = false;
	let tagProperty = "";
	let tagValue = "";
	let ref;

	let nameInput;
	let dateInput;

	function addTagEntryField(tagType)
	{
		return function(){

			tagProperty = tagType;
			tagValue = "";
			enteringTag = true;
			setTimeout(()=>{ref.focus()}, 10);
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
			for(let i=0; i<tags.length; i++)
			{
				if(tags[i].property == "pl")
				{
					tags.splice(i, 1)
					i--;
				}
			}
		}

		tags.push(tag);
		tags.sort(tagComp)
		tags = tags;

		console.log(tags);
	};

	function tagComp(tag1, tag2){
		if(tag1.property == tag2.property){
			if (tag1.value > tag2.value) return 1;
			if (tag2.value > tag1.value) return -1;
			return 0;  
		}

		let k = propertyOrder(tag1.property) - propertyOrder(tag2.property);
		if(k != 0) return k;

		if (tag1.propety > tag2.property) return 1;
		if (tag2.propery > tag1.value) return -1;
		return 0;
	}

	function propertyOrder(prop){
		switch(prop){
			case "hyperlink": return 0;
			case "artist": return 1;
			case "featured artist": return 2;
			case "pl": return 3;
			default: return 4;
		}
	}

	function removeTag(tag)
	{
		return function()
		{
			for(let i=0; i<tags.length; i++)
			{
				console.log(tags[i]);
				console.log(tag);

				if(tags[i].property == tag.property && tags[i].value == tag.value)
				{
					tags.splice(i, 1)
					break;
				}
			}

			tags = tags;
		}
	}

	function saveData()
	{
		var data = {
			name: nameInput.value.trim(),
			date: dateInput.value.trim(),
			tags
		}

		if(name.len)
		console.log(nameInput.value);
		console.log(dateInput.value);
		console.log(tags);
	}
</script>

<style>
	.label 
	{
		display: inline-block;

		line-height: 35px;
	}

	.field .label
	{
		vertical-align: top;
		width: .8in;
		text-align: right;
	}

	.field { margin: 6px 0px; }

	.field-value
	{
		display: inline-block;
	}

	.post-tags{
		margin-top: 20px;
	}

	

	input {margin: 0px}
</style>

<h1>Add Track</h1>

<div>
	
	<div class='field'>
		<span class="label" >Name:</span>
		<input id='name' type="text" maxlength="255" bind:this={nameInput}/>
	</div>
	<div class='field'>
		<span class="label">Released:</span>
		<input id='release-date' type="date" bind:this={dateInput}/>
	</div>
	<div class='field'>
		<span class="label">Tags:</span>
		<div class='field-value'>
			
			{#each tags as tag}
				<Tag property={tag.property} value={tag.value} on:remove={removeTag(tag)}/>
			{/each}

			{#if enteringTag}
				<TagEntryInput 
					property={tagProperty}
					value={tagValue}
					bind:ref
					on:valueSet={onEntry}
				/>

			{/if}

			<div id="tag-warnings"></div>
		</div>
	</div>
	<div class='field post-tags'>
		<span class="label"></span>
		<div class='field-value'>
			<div>
				<button on:click={addTagEntryField("hyperlink")}>+ Hyperlink</button>
				<button on:click={addTagEntryField("artist")}>+ Artist</button>
				<button on:click={addTagEntryField("featured artist")}>+ Featured Artist</button></div>
			<div>
				<button on:click={()=>{addTag({property:"pl",value:"4"})}}>Obviously Pony</button>
				<button on:click={()=>{addTag({property:"pl",value:"3"})}}>Pony</button>
				<button on:click={()=>{addTag({property:"pl",value:"2"})}}>Pony Inspired</button>
				<button on:click={()=>{addTag({property:"pl",value:"1"})}}>Not Pony</button>
			</div>
			<div>
				<button on:click={addTagEntryField("genre")}>+ Genre</button>
				<button>+ Album</button>
				<button>+ Remix</button>
			</div>
		</div>
	</div>
</div>

<div><button on:click={saveData}>Update</button></div>
