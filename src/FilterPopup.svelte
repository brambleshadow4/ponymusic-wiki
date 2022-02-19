<script>

	export let property="release_date";

	let startYear = 2010;
	let startMonth = 9;

	let currentYear = new Date().getFullYear();
	let currentMonth = new Date().getMonth();

	let months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

	let groups = {
		name: "All",
		level: 0,
		children: []
	}

	let year = currentYear;

	while(year >= startYear)
	{
		let yearGroup = {
			name: year,
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
					value: year + "-" + month,
					parent: yearGroup
				});
			}
		}

		year--;
	}

	let filterItems = [];

	function flattenGroups(arr, group)
	{
		arr.push(group);


		if(group.children)
		{
			for(let c of group.children)
			{
				flattenGroups(arr, c);
			}
		}
	}

	flattenGroups(filterItems, groups)

	filterItems = filterItems;

	
	

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
	}

	h1{
		margin: 0;
		margin-bottom: 5px;
	}

	label {
		display: inline-block;
		cursor: pointer;
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
	<h1>Filter by Year</h1>
	<div><input type="search" placeholder="Search" /></div>
	<div class='filter-items'>
		{#each filterItems as filter, i}

			
			<div><input class={"indent-" + filter.level} type="checkbox" id={"filter-"+i}/><label for={"filter-"+i}>{filter.name}</label></div>

		{/each}
	</div>
	<div><button>Apply</button><button>Cancel</button></div>
</div>
