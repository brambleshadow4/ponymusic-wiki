<script>
	import Grid from "../GenericGrid.svelte";

	let columns = [{name: "Status"}];
	let tableData = [];
	let colMappings = {};

	let columnBindings = {
		"Artist": {no: -1},
		"Release Date": {no: -1},
		"Title": {no: -1},
		"Hyperlink": {no: -1},
		"Tags": {no: -1}
	}

	let openedRow = null;



	function getNodeText(node)
    {
        if(node.childNodes.length == 0)
        {
            return node.innerHTML || node.textContent;
        }
        else 
        {
            let texts = [];
            for(let i =0; i < node.childNodes.length; i++)
            {
                texts.push(getNodeText(node.childNodes[i]));
            }
            return texts.filter(x => x.trim() != "").join("");
        }
    }

    function updateAllRows()
    {
    	for(let row of tableData)
    	{
    		updateRowStatus(row)
    	}

    	tableData = tableData;
    }

	async function readPasteData()
	{
		let items = await navigator.clipboard.read();
		let htmlItem = items.filter( x=> x.types.includes("text/html"))[0];

		if(!htmlItem){
			console.log("no html item")
			return;
		}

		let blob = await htmlItem.getType("text/html")
		let html = await blob.text();

		let parser = new DOMParser();
		let doc = parser.parseFromString(html, "text/html");

		let rows = doc.getElementsByTagName('tr');

		let newTableData = [];

		for(let i=0; i<rows.length; i++)
		{
			let arr = [{text: ""}];
			let tds = rows[i].getElementsByTagName('td');

			for(let j=0; j< tds.length; j++)
			{
				arr.push(getNodeText(tds[j]));
			}

			newTableData.push(arr)

		}
		
		tableData = tableData.concat(newTableData)
		console.log(tableData)
	}

	async function importAllReady()
	{
		for(let i=0; i < tableData.length; i++)
		{
			let row = tableData[i];

			if(row[0].text != "Ready")
				continue;

			let [_, text] = await getTrackStatus(row);

			if(text != "Ready")
			{
				updateRowStatus(row);
				continue;
			}

			let track = convertRowToTrack(row)[0];

			var data = {
				id: "new",
				title: track.title,
				release_date: track.release_date,
				tags: track.tags,
				session: sessionStorage.session
			}

			var response = {};

			try 
			{
				response = await (await fetch("/api/track", 
				{
					method: "POST",
					headers: {"Content-Type": "text/json"},
					body: JSON.stringify(data)
				})).json();
			}
			catch(e){};

			if(response.status != 200)
			{	
				innerUpdateRowStatus(row, "red", response.error);
				tableData = tableData;
			}
			else
			{
				updateRowStatus(row);
			}
		}
	}

	function colHasKeywords(cell, keywords)
	{
		return keywords.map(x => cell.toLowerCase().indexOf(x) > -1).reduce((a,b)=> a || b, false);
	}

	function processData()
	{	
		let maxRows = tableData.map(x => x.length).reduce(function(a,b){return Math.max(a,b)}, 0)
		
		let useFirstRowAsHeaders = false;
		let row1 = tableData[0];
	
		for(let i=1; i<row1.length; i++)
		{
			let cell = row1[i];
			if(colHasKeywords(cell, ["artist","musician"]) && columnBindings["Artist"].no == -1)
			{
				useFirstRowAsHeaders = true;
				columnBindings["Artist"].no = i;
				continue;
			}
			if(colHasKeywords(cell, ["date","release"]) && columnBindings["Release Date"].no == -1)
			{
				useFirstRowAsHeaders = true;
				columnBindings["Release Date"].no = i;
				continue;
			}
			if(colHasKeywords(cell, ["title","name","song"]) && columnBindings["Title"].no == -1)
			{
				useFirstRowAsHeaders = true;
				columnBindings["Title"].no = i;
				continue;
			}
			if(colHasKeywords(cell, ["link","url"]) && columnBindings["Hyperlink"].no == -1)
			{
				useFirstRowAsHeaders = true;
				columnBindings["Hyperlink"].no = i;
				continue;
			}
		}

		if (useFirstRowAsHeaders)
		{
			for(let i=1; i < tableData[0].length; i++)
			{
				columns.push({name: (tableData[0][i] || "Column " + columns.length )});
			}
			tableData = tableData.slice(1);
		}

		while(columns.length < maxRows)
		{
			columns.push({name: "Column " + columns.length})
		}

		for(let row of tableData)
		{
			updateRowStatus(row)
		}
		
		tableData = tableData;
		columns = columns;	
	}

	function convertRowToTrack(row)
	{
		if(columnBindings["Title"].no == -1 || columnBindings["Hyperlink"].no == -1){
			return [null, "",""]
		}

		let rawTitle = row[columnBindings["Title"].no]
		let rawHyperlink = row[columnBindings["Hyperlink"].no]
		let rawArtist = row[columnBindings["Artist"].no]
		let rawReleaseDate = row[columnBindings["Release Date"].no]
		let rawTags = row[columnBindings["Tags"].no] || "";


		if([rawTitle, rawHyperlink, rawArtist, rawReleaseDate].indexOf(undefined) > -1)
		{
			return [null, "red", "Incomplete Data"];
		}

		if([rawTitle, rawHyperlink, rawArtist, rawReleaseDate].map(x => x.trim()).indexOf("") > -1)
		{
			return [null, "red", "Incomplete Data"]
		}

		let dt = new Date(rawReleaseDate)

		if(isNaN(dt.getTime()))
		{
			return [null, "red", "Bad Data"];
		}

		let track = {
			title: rawTitle.trim(),
			release_date: dt.toISOString().substring(0,10),
			tags: [],
		};

		track.tags.push({property: "artist", value: rawArtist});

		let hyperlinks = rawHyperlink.split(/,? /g);
		for(let link of hyperlinks)
		{
			if(!/^http(s)?:\/\//.exec(link))
			{
				return [null, "red", "Bad Data"];
			}

			track.tags.push({property: "hyperlink", value: link});
		}

		let tagsProcessed = rawTags.split(", ").map(x => x.trim()).filter(x => x != "");
		for(let tag of tagsProcessed)
		{
			track.tags.push({property: "tag", value: tag});
		}



		return [track, "", ""];

	}
	

	async function getTrackStatus(row)
	{
		let [track, statusColor, statusText] = convertRowToTrack(row);

		if(!track)
		{
			return [statusColor, statusText];
		}

		var data = {
			id: "new",
			title: track.title,
			tags: track.tags,
			session: sessionStorage.session
		}

		var response = {};
		try 
		{
			//console.log("sending request for " + data.title)
			response = await (await fetch("/api/getTrackWarnings", {
				method: "POST",
				headers: {"Content-Type": "text/json"},
				body: JSON.stringify(data)
			})).json();
		}
		catch(e){
			console.log(e)
		};

		row[0].trackWarnings = response;

		if(!response.warnings)
		{
			return ["green", "Ready"]
		}

		if(response.sameHyperlink.length > 0 || response.albumHyperlink.length > 0)
		{
			return ["", "In Wiki"];
		}

		if(response.sameTitle.length > 0)
		{
			let oldDupes = new Set();
			if(row[0].dismissedTrackWarnings)
			{
				for(let warning of row[0].dismissedTrackWarnings.sameTitle)
				{
					oldDupes.add(warning.id);
				}
			}

			for(let warning of response.sameTitle)
			{
				if(oldDupes.has(warning.id))
					continue

				return ["orange", "Potential Dup"];
			}	
		}

		if(response.unknownArtists.length > 0)
		{
			let dismissed = new Set();
			if(row[0].dismissedTrackWarnings)
			{
				for(let artist of row[0].dismissedTrackWarnings.unknownArtists)
				{
					dismissed.add(artist)
				}
			}

			for(let artist of response.unknownArtists)
			{
				if(!dismissed.has(artist))
				{
					return ["orange", "Unknown Artist"];
				}
			}	
		}

		// other warnings have been dismissed
		return ["green", "Ready"];
	}

	async function updateRowStatus(row)
	{
		innerUpdateRowStatus(row, "", "loading...")
		tableData = tableData
		let [color, text] = await getTrackStatus(row);

		innerUpdateRowStatus(row, color, text);
		tableData = tableData
	}

	function innerUpdateRowStatus(row, color, text)
	{	
		row[0].text = text;
		if(color == "")
		{
			delete row[0].color;
			delete row[0].backgroundColor;
		}
		else
		{
			row[0].color = "white";
			row[0].backgroundColor = color;
		}	
	}

	function handleRowClick(e)
	{
		if(e.detail[0].trackWarnings && e.detail[0].trackWarnings.sameHyperlink[0])
		{
			let link = "/track/" + encodeURIComponent(e.detail[0].trackWarnings.sameHyperlink[0].id);
			open(link);
			return;
		}
		

		openedRow = e.detail
	}

	window.addEventListener('paste', async function(ev){
		await readPasteData()
		processData();

	})

</script>

<div>
	<h1>Upload CSV file:</h1><span>Copy+Paste a table, or upload a CSV file</span><input type='file'>
</div>

{#if tableData.length}
	
	<div><strong>Bindings</strong></div>

	<div class='bindings'>
		{#each Object.keys(columnBindings) as key}
			<div>
				<span class='binding-label'>{key}</span>
				<select bind:value={columnBindings[key].no} on:change={updateAllRows}>
					<option value="-1"></option>
					{#each columns.slice(1) as col, i}
						<option value={i+1}>
							{col.name}
						</option>
					{/each}
				</select>
			</div>
		{/each}
	</div>

	<div>
		<button on:click={updateAllRows}>Refresh All</button><button on:click={importAllReady}>Import All</button>
	</div>
{/if}



{#if openedRow}
	<div class='popup-container'>
		<div class='popup'>

			{#if openedRow[0] && openedRow[0].trackWarnings}
				{#if openedRow[0].trackWarnings.sameTitle.length}
					<div>This track has the same title as other tracks. Please make sure it is not a duplicate of the following:</div>
					{#each openedRow[0].trackWarnings.sameTitle as item}
						<div class='indent'>
							<a target="_blank" href={"/track/" + item.id}>{item.name}</a>
							<button class='mini-button' on:click={()=>onMerge(item.id)}>Merge &gt;&gt;</button>
						</div>
					{/each}
				{/if}
				{#if openedRow[0].trackWarnings.unknownArtists.length}
					<div>This track has an artist that is currently not in the wiki. Please make sure the name is correct:</div>
					{#each openedRow[0].trackWarnings.unknownArtists as item}
						<div class='indent'>{item}</div>
					{/each}
				{/if}
				{#if openedRow[0].trackWarnings.albumHyperlink.length}
					<div>This track has a hyperlink that is associated with an album. Instead of adding it to the track, add the album tag instead</div>
					{#each openedRow[0].trackWarnings.albumHyperlink as item}
						<div class='indent'>{item.albumName}</div>
					{/each}
				{/if}

				<button on:click={() => {

					openedRow[0].dismissedTrackWarnings = openedRow[0].trackWarnings;
					updateRowStatus(openedRow); 
					tableData = tableData;
					openedRow = null; 
				}}>Dismiss Warnings</button>
			{/if}

			<button on:click={() => {
				
			}}>Edit</button>


			<button on:click={() => {
				updateRowStatus(openedRow); 
				tableData = tableData;
				openedRow = null; 
			}}>Close</button>
		</div>
	</div>
{/if}

<Grid data={tableData} columns={columns} on:rowclick={handleRowClick}/>

<style>

	.popup-container {
		position: absolute;
		top: 0;
		bottom:0;
		left:0;
		right:0;
		z-index: 5;
		background-color: rgba(0,0,0,.2);
	}

	.popup {
		z-index: 3;

		max-width: 800px;
		margin: auto;
		margin-top: 8px;


		background-color: white;
		padding: .3in;
		border: solid 2px black;
	}

	.indent {
		padding-left: 20px;
	}

	.bindings {
		/*display: grid;
		/*grid-template-columns: 60px 60px;grid-template-columns: 200px, 50px;
		grid-template-columns: repeat(auto-fill, 300px);*/
	}

	.bindings div {
		display: inline-block;

	}

	.binding-label {
		display: inline-block;
		text-align: right;
		padding-right: 5px;
		padding-left: 20px;
	}

	h1 {
		display: inline-block;
		margin-right: 20px;
	}

	input {
		margin-left: 10px;
	}

</style>