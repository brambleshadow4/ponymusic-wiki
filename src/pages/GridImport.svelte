<script>
	import Grid from "../GenericGrid.svelte";
	import RadioGroup from "../RadioGroup.svelte"
	import {canonicalURL} from "../helpers.js";

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
	let sortMode = 0;



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

	function sort()
	{
		if(sortMode == 0)
		{
			tableData.sort(function(a,b){
				return a[0].order - b[0].order;
			})

			tableData = tableData;
		}
		else
		{
			function getGroup(track)
			{
				if(track[0].text == "loading...")
					return 0;

				if(track[0].backgroundColor == 'green')
					return 1;

				if(track[0].backgroundColor == "orange")
				{
					if(track[0].text == "Unknown Artist")
						return 2
					return 3;
				}


				if(track[0].backgroundColor == "red")
				{
					if(track[0].text == "Bad Data")
						return 4;
					return 5;
				}

				return 6;

			}

			let colorMap = {
				"red": 3,
				"orange": 2,
				"green": 1,
				"": 4,
			}
			tableData.sort(function(a,b){

				let group1 = getGroup(a);
				let group2 = getGroup(b);

				if(group1 - group2 == 0)
					return a[0].order - b[0].order

				return group1 - group2;
			})

			tableData = tableData;
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

			arr[0].order = newTableData.length;
			newTableData.push(arr)

		}
		
		tableData = tableData.concat(newTableData)
		console.log(tableData)
	}

	let importThreshold = 5;

	async function importAllReady()
	{
		console.log("importAllReady");
		for(let i=0; i < tableData.length; i++)
		{
			let row = tableData[i];

			if(row[0].text != "Ready")
				continue;

			importThreshold--;	
			importOneRow(row);

			if(importThreshold <= 0)
				return;

		}
	}

	async function importOneRow(row)
	{
		innerUpdateRowStatus(row, "", "loading...");

		let [_, text] = await getTrackStatus(row);

		if(text != "Ready")
		{
			updateRowStatus(row);
			return;
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
		importThreshold++;
		if(importThreshold > 0)
			importAllReady();
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

	/**
	 * Returns 3 items [<the converted row, ?, ?]
	 * */
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

			track.tags.push({property: "hyperlink", value: canonicalURL(link)});
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

		if(response.status != 200)
		{
			return ["red", response.error]
		}

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

	/**
	 *  Updates the row status (includes displaying it while loading)
	 */
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

	var fileInputEl = null;

	function parseCSV(rawText)
	{
		let mode = 0;

		let start = 0;
		let ptr = 0;

		let data = [];
		let row = [];

		rawText = rawText.replace(/\r\n/g,"\n");


		while(true)
		{
			if(mode == 0) // starting a new string
			{
				if(rawText[ptr] == ",")
				{
					row.push(rawText.substring(start, ptr));
					start = ptr+1;
					ptr = start;
				}
				else if(rawText[ptr] == "\n")
				{
					row.push(rawText.substring(start, ptr));
					data.push(row);
					row = [];
					start = ptr+1;
					ptr = start;
				}
				else if(rawText[ptr] == "\"")
				{
					mode = 2;
					start = ptr;
					ptr++;
				}
				else if(rawText[ptr] == "" || rawText[ptr]=== undefined )
				{
					break;
				}
				else
				{
					mode = 1;
					ptr++;
				}
			}
			else if(mode == 1) // middle of a string, not in quotes
			{
				if(rawText[ptr] == ",")
				{
					row.push(rawText.substring(start, ptr));
					start = ptr+1;
					ptr = start;
					mode = 0;
				}
				else if(rawText[ptr] == "\n" || rawText[ptr] == "" || rawText[ptr]=== undefined )
				{
					row.push(rawText.substring(start, ptr));
					data.push(row);
					row = [];
					start = ptr+1;
					ptr = start;
					mode = 0;
				}
				else if(rawText[ptr] == '"')
				{
					throw new Error("Quote not escaped @" +ptr + " - " + rawText.substring(ptr-10, ptr) + " <--");
				}
				else
				{
					ptr++;
				}
			}
			else if (mode ==2) // prcoessing a string in quotes
			{
				if(rawText[ptr] == "\"")
				{
					ptr++;
					mode = 3;
				}
				else if(rawText[ptr] == "")
				{
					throw new Error("String ended before string was closed");
				}
				else
				{
					ptr++;
				}
			}
			else if (mode == 3) // string in quotes is just closed, or it continues w/ another " character
			{
				if(rawText[ptr] == "\"")
				{
					ptr++;
					mode = 2;
				}
				else if(rawText[ptr] == ",")
				{
					let s = rawText.substring(start+1, ptr-1);
					s = s.replace(/\"\"/g,"\"");
					row.push(s);
					ptr++;
					start = ptr;
					mode = 0;
					
				}
				else if(rawText[ptr] == "\n" || rawText[ptr] == "")
				{
					let s = rawText.substring(start+1, ptr);
					s = s.replace(/\"\"/g,"\"")
					row.push(s);
					data.push(row);
					row = [];
					ptr++;
					start = ptr;
					mode = 0;
				}
				else
				{
					console.log(rawText[ptr].charCodeAt(0));
					throw new Error("Unexpected character after ending a string @" +ptr + " - " + rawText.substring(ptr-10, ptr) + "<--");
				}
			}
		}

		console.log(data);

		return data;
	}


	function importFile()
	{
		if(!fileInputEl.files[0])
			return;

		var reader = new FileReader();
		reader.readAsText(fileInputEl.files[0], "UTF-8");
		reader.onload = function (evt)
		{
			let data = parseCSV(evt.target.result);

			tableData = data.map((x,i) => [{text:"", order: i}, ...x]);
			processData();
		}
		reader.onerror = function (evt) {
			console.log(evt)
			console.err("Failed to read csv file")
		}
	}

	function mergeRowToTrack(row, idToMergeTo)
	{
		let trackData = convertRowToTrack(row)[0];
		trackData.id = idToMergeTo;
		sessionStorage.merge_data = JSON.stringify(trackData);
		window.open("/track/" + idToMergeTo,"_blank");
		closeRowOnReturn();
	}

	function closeRowOnReturn()
	{
		let callbackObj = {};
		callbackObj.fn = function(){

			console.log("this is cool! " + new Date().toLocaleString());
			window.removeEventListener("focus", callbackObj.fn);
			updateRowStatus(openedRow); 
			tableData = tableData;
			openedRow = null; 

			delete sessionStorage.merge_data;
		}

		window.addEventListener('focus', callbackObj.fn)
	}


</script>

<div>
	<h1>Upload CSV file:</h1><span>Copy+Paste a table, or upload a CSV file</span><input bind:this={fileInputEl} type='file' on:input={importFile}>
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
		<button on:click={updateAllRows}>Refresh All</button>
		<button on:click={() => {importThreshold = 5; importAllReady()}}>Import All</button>
		
		<RadioGroup bind:checked={sortMode} on:change={sort} options={["Original order","Group by Status"]}/>
		<span>
			{#if tableData.filter(x => x[0].text == "loading...").length}
				Loading data
			{:else}
				All Loaded
			{/if}

		</span>
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
							<button class='mini-button' on:click={() => mergeRowToTrack(openedRow, item.id)}>Merge &gt;&gt;</button>
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
				let track = convertRowToTrack(openedRow)[0];
				let url = "/track/new?trackPost="+encodeURIComponent(JSON.stringify(track));
				window.open(url);
				closeRowOnReturn();

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