<script>
	import { createEventDispatcher } from 'svelte';
	import { getAutofill } from "./helpers.js";

	export let property="release_date";
	export let value = {noFilter: true};

	let dispatch = createEventDispatcher();
	

	let filterItems = [];
	let title = "";

	let groups = {
		name: "All",
		level: 0,
		children: []
	};

	async function loadPopupData()
	{
		groups = {
			name: "All",
			level: 0,
			children: []
		};

		console.log(property);

		switch(property)
		{
			case "artist":
				let rows = await getAutofill("artist", -1, "");
				rows = rows.map(x => x.value);
				groups.children = rows.map(x => {return {name: x, value: x, level: 1, parent: groups[0]}});
				title = "Artist"
				break;
			case "release_date":
				groups = releaseDateGroups(); 
				title = "Release Date";
				break;
		}

		flattenGroups(filterItems, groups)

		filterItems = filterItems;

	}

	loadPopupData();

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
			children: []
		};

		let year = currentYear;

		while(year >= startYear)
		{
			let yearGroup = {
				name: "" + year,
				level: 1,
				children: [],
				parent: groups
			}

			groups.children.push(yearGroup);

			for(let month=0; month<12; month++)
			{
				if((year < currentYear || month <= currentMonth) && (year > startYear || month >= startMonth))
				{
					yearGroup.children.push({
						name: months[month] + " " + year,
						level: 2,
						value: year + "-" + pad0(month),
						parent: yearGroup
					});
				}
			}

			year--;
		}

		return groups;
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
					allFalse = true;
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

	function cancelFilter()
	{

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
	<div><input type="search" placeholder="Search" on:input={updateSearch}/></div>
	<div class='filter-items'>
		{#each filterItems as filter, i}

			<div><input class={"indent-" + filter.level} type="checkbox" id={"filter-"+i} on:click={(e) => toggleCheckBox(e, i, filter)} /><label for={"filter-"+i}>{filter.name}</label></div>

		{/each}
	</div>
	<div><button on:click={saveFilter}>Apply</button><button on:click={cancelFilter}>Cancel</button></div>
</div>
