<script>
	import { createEventDispatcher } from 'svelte';
	import { getAutofill } from "./helpers.js";

	export let property="release_date";
	export let value = {noFilter: true};

	let dispatch = createEventDispatcher();

	let freeTextInput = false;
	var freeTextPrompts;

	
	let filterItems = [];
	let title = "";

	let groups = {
		name: "All",
		level: 0,
		children: [],
		checked: 3,
	};

	async function loadPopupData(value)
	{
		groups = {
			name: "All",
			level: 0,
			children: [],
			checked: 3,
		};

		switch(property)
		{
			case "artist":
				groups = await autofillGroups("artist")
				title = "Artist"
				break;
			case "genre":
				groups = await autofillGroups("genre")
				title = "Genre"
				break;
			case "album":
				groups = await autofillGroups("album")
				title = "Album"
				break;
			case "release_date":
				groups = releaseDateGroups(); 
				title = "Release Date";
				break;
			case "pl":
				groups = plGroups(); 
				title = "Pony References";
				break;
			case "title":
				freeTextInput = true;
				title = "keywords in Title";
				break;
		}

		flattenGroups(filterItems, groups)

		initialCheckItems(groups);

		filterItems = filterItems; //render
	}

	function nxor(a,b)
	{
		return (!a && !b) || (a && b);
	}

	$: dummy = loadPopupData(value);

	function releaseDateGroups()
	{
		let startYear = 2010;
		let startMonth = 9;

		let currentYear = new Date().getFullYear();
		let currentMonth = new Date().getMonth();

		let months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

		let groups = {
			name: "All",
			level: 0,
			checked: 3,
			children: []
		};

		let year = currentYear;

		while(year >= startYear)
		{
			let yearGroup = {
				name: "" + year,
				level: 1,
				children: [],
				parent: groups,
				checked: 3,
			}

			groups.children.push(yearGroup);

			for(let month=0; month<12; month++)
			{
				if((year < currentYear || month <= currentMonth) && (year > startYear || month >= startMonth))
				{
					yearGroup.children.push({
						name: months[month] + " " + year,
						level: 2,
						value: year + "-" + pad0(month+1),
						parent: yearGroup,
						checked: 3,
					});
				}
			}

			year--;
		}

		return groups;
	}

	function plGroups()
	{
		let groups = {
			name: "All",
			level: 0,
			checked: 3,
			children: []
		};

		let children = [
			{
				name: "(blank)",
				level: 1,
				checked: 3,
				value: "",
				parent: groups
			},
			{
				name: "Obvious Refs",
				level: 1,
				checked: 3,
				value: "2",
				parent: groups
			},
			{
				name: "Subtle Refs",
				level: 1,
				checked: 3,
				value: "1",
				parent: groups
			},
			{
				name: "No Refs",
				level: 1,
				checked: 3,
				value: "0",
				parent: groups
			},
		];

		groups.children = children;
		return groups;
	}

	function initialCheckItems(groups)
	{
		if(value.noFilter){
			return;
		}

		let includeValues = !!value.include;
		let valueSet = new Set(value.include || value.exclude);

		recursiveInitialCheckItems(groups, includeValues, valueSet);
	}

	function recursiveInitialCheckItems(group, includeValues, valueSet)
	{
		if(group.children)
		{
			for(let child of group.children)
			{
				recursiveInitialCheckItems(child, includeValues, valueSet);
			}
		}

		if(group.value != undefined)
		{
			if(nxor(includeValues, valueSet.has(group.value)))
			{
				group.checked = 2;
			}
			else
			{
				group.checked = 1;
			}
		}

		if(group.parent)
		{
			group.parent.checked = group.parent.checked & group.checked;
		}
	}

	async function autofillGroups(property)
	{
		let groups = {
			name: "All",
			level: 0,
			children: [],
			checked: 3
		};
		let rows = await getAutofill(property, -1, "");
		rows = rows.map(x => x.value);

		groups.children.push({
			name: "(blank)",
			level: 1,
			checked: 3,
			value: ""
		})

		groups.children = groups.children.concat(rows.map(x => {return {name: x, value: x, level: 1, parent: groups}}));
		return groups;
	}

	function updateFreeTexts()
	{
		var inputs = freeTextPrompts.getElementsByTagName('input');
		let hasEmptyPrompt = false;

		for(var i=0; i<inputs.length; i++)
		{
			let isLast = (i+1 == inputs.length)
			let isEmpty = inputs[i].value.trim() == ""

			if(!isLast && isEmpty)
			{
				inputs[i].parentNode.parentNode.removeChild(inputs[i].parentNode)
				i--;
				continue;
			}

			if(isLast && !isEmpty)
			{
				let div = document.createElement('div');
				let input = document.createElement('input');
				input.placeholder = "Keyword/phrase";
				input.oninput = updateFreeTexts;

				div.appendChild(input);
				freeTextPrompts.appendChild(div);
			}
		}
	}

	function pad0(n)
	{
		if(n < 10){
			return "0" + n;
		}

		return "" + n;
	}

	function flattenGroups(arr, group)
	{
		arr.push(group);
		group.index = arr.length-1;

		if(group.children)
		{
			for(let c of group.children)
			{
				flattenGroups(arr, c);
			}
		}
	}

	function toggleCheckBox(e, index, filter)
	{
		let isChecked = e.target.checked;

		checkChildren(filter, isChecked)
		checkParent(filter)
	}

	function checkChildren(filter, isChecked)
	{
		if(filter.children)
		{
			for(let child of filter.children)
			{
				let el = document.getElementById('filter-' + child.index);
				el.checked = isChecked;
				el.indeterminate = false;

				checkChildren(child, isChecked)
			}
		}
	}

	function checkParent(filter)
	{
		if(filter.parent)
		{
			let parent = filter.parent;
			let siblings = parent.children;
			let allTrue = true;
			let allFalse = true;

			for(let sibling of siblings)
			{
				let el = document.getElementById('filter-' + sibling.index);

				if(el.checked){
					allFalse = false;
				}
				else {
					allTrue = false;
				}

				if(el.indeterminate)
				{
					allFalse = false;
					allTrue = false;
				}

				if(!allTrue && !allFalse){
					break
				}
			}

			let el = document.getElementById('filter-' + parent.index);

			if(allTrue)
			{
				el.checked = true;
				el.indeterminate = false;
			}
			else if(allFalse)
			{
				el.checked = false;
				el.indeterminate = false;
			}
			else 
			{
				el.indeterminate = true;
			}

			checkParent(parent);
		}
	}

	function updateSearch(e)
	{
		let value = e.target.value.toLowerCase().trim();

		for(let filter of filterItems)
		{
			// always want to show the all filter
			if(filter.level == 0){
				continue;
			}

			let el = document.getElementById('filter-' + filter.index);

			if(filter.name.toLowerCase().indexOf(value) == -1){
				el.parentNode.style.display = "none";
			}
			else{
				el.parentNode.style.display = "block";
			}
		}
	}

	function saveFilter()
	{
		if(freeTextInput){
			saveFreeTextInputFilter();
			return;
		}

		let posFilters = [];
		let negFilters = [];

		for(let filter of filterItems)
		{
			if(filter.value == undefined){
				continue;
			}
			
			let el = document.getElementById('filter-' + filter.index);

			if(el.checked){
				posFilters.push(filter.value)
			}
			else {
				negFilters.push(filter.value)
			}
		}

		if(negFilters.length == 0 || posFilters.length == 0)
		{
			dispatch("change", {
				property,
				noFilter: true
			});

			return;
		}

		if(posFilters.length < negFilters.length)
		{
			dispatch('change', {
				property,
				include: posFilters
			})
		}
		else
		{
			dispatch('change', {
				property,
				exclude: negFilters
			})
		}
	}

	function saveFreeTextInputFilter()
	{
		var inputs = freeTextPrompts.getElementsByTagName('input');
		let vals = [];

		for(var i=0; i<inputs.length; i++)
		{
			if(inputs[i].value.trim() != "")
			{
				vals.push(inputs[i].value.trim());
			}
		}

		if(vals.length)
		{
			dispatch('change', {
				property,
				include: vals
			})
		}
		else
		{
			dispatch('change', {
				property,
				noFilter: true
			})
		}
	}

	function cancelFilter()
	{
		dispatch('change', value);
	}


</script>


<style>
	
	.popup
	{
		max-width: 600px;
		background-color: white;
		margin: auto;
		padding: 15px 0 15px 15px;

		margin-top: .5in;

		max-height: 80vh;

		display: flex;
		flex-direction: column;
	}

	.filter-items
	{
		overflow-y: scroll;
		flex-grow: 1;
		min-height: 100px;
	}

	h1{
		margin: 0;
		margin-bottom: 5px;
	}

	label {
		display: inline-block;
		cursor: pointer;
		user-select: none;
	}

	input[type="checkbox"]
	{
		margin: 0px 10px ;
	}

	input[type="checkbox"].indent-1
	{
		margin-left: 30px;
	}
	input[type="checkbox"].indent-2
	{
		margin-left: 50px;
	}

</style>



<div class='popup'>
	<h1>Filter by {title}</h1>

	{#if !freeTextInput}
		<div><input type="search" placeholder="Search" on:input={updateSearch}/></div>
		<div class='filter-items'>
			{#each filterItems as filter, i}

				<div>
					<input 
						class={"indent-" + filter.level}
						checked={filter.checked == 2}
						indeterminate={filter.checked == 0}
						type="checkbox" 
						id={"filter-"+i}
						on:click={(e) => toggleCheckBox(e, i, filter)} />
					<label for={"filter-"+i}>{filter.name}</label>
				</div>

			{/each}
		</div>
	{:else}

		<div bind:this={freeTextPrompts}>

			{#if value.include}
				{#each value.include as item}
					<div><input type="text" placeholder="Keyword/phrase" class='freeText' on:input={updateFreeTexts} value={item}/></div>
				{/each}
			{/if}

			<div><input type="text" placeholder="Keyword/phrase" class='freeText' on:input={updateFreeTexts}/></div>
		</div>
	{/if}
	<div><button on:click={saveFilter}>Apply</button><button on:click={cancelFilter}>Cancel</button></div>
</div>
