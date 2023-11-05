let aliases = {
	"Ponies at Dawn": "",
	"LBP": "LoneBronyProductions",
	"CantoAcrylicVA": "CantoAcrylic",
	"FenPhoenix": "FenPony",
	"Fen": "FenPony",
	"El Brony Villero": "Brony Villero",
	"El Brony Villero :v": "Brony Villero",
	"Matthew Mosier Music": "Matthew Mosier",
	"FillyInTheBox": "Filly in the Box",
	"ThunderShyOfficial-2": "ThunderShy",
	"ThunderShyOfficial-2 AI": "ThunderShy",
	"ThunderShyOfficial-2 Ai": "ThunderShy",
	"Canto": "CantoAcrylic",
	"TunedPonyMusic and MLP Stuff": "TunedPonyMusic",
	"TunedPonyMusic and MLP Stuff AI": "TunedPonyMusic",
}


function parseTitle(title)
{
	let parsedTitle = title.replace(/<\/?(span|a)[^>]*>/g,"");
	//let parseRule = localStorage.parseRule;
	let tags = [];

	let parsedTitleLowerCase = parsedTitle.toLowerCase();

	if(parsedTitleLowerCase.indexOf("vip") > -1 
		|| parsedTitleLowerCase.indexOf("remix") > -1 
		|| parsedTitleLowerCase.indexOf("cover") > -1)
		tags.push({property:"tag",value:"x-needs-remix-linking", text:"x-needs-remix-linking"});


	title = title.replace(/【Music】/g,"");

	let match = /(?:(.*)?(?: - | – ))?(.*)/.exec(title);

	let artistList = (match[1] || "").trim();
	let songName = match[2].trim();
	
	if(artistList)
	{
		artistList = artistList.split(/,|&| and /g).map(x => x.trim()).filter(x => x);

		for(let artist of artistList)
		{
			tags.push({property:"artist", value: artist, text: artist});	
		}
	}

	var featArtistString = "";


	while(true)
	{
		match = /.*\((?:F|f)e?a?t\.? (.*)\)/.exec(songName);
		if(match)
		{
			featArtistString = match[1];
			break;
		}


		match = /.*(?:F|f)e?a?t\.? (.*)/.exec(songName);
		if(match)
		{
			featArtistString = match[1];
			break;
		}

		match = /.*w\/ (.*)/.exec(songName);

		if(match)
		{
			featArtistString = match[1];
			break;
		}

		match = /.*\((?:V|v)c\.? (.*)\)/.exec(songName);

		if(match)
		{
			featArtistString = match[1];
			break;
		}

		
		break;
	}

	// handle producer credit
	match = /.*\((?:P|p)rod\.? (.*)\)/.exec(songName);

	if(match)
	{
		tags.push({property:"artist", value: match[1], text: match[1]});
	}

	if(featArtistString)
	{
		let featArtists = featArtistString.split(/,|&| and /g).map(x => x.trim()).filter(x => x);

		for(let artist of featArtists)
		{
			tags.push({property:"featured artist", value: artist , text: artist});
		}
	}

	return {title: songName, tags};
}


function artistAlias(name)
{
	if(aliases[name])
		return aliases[name]
	return name;
}


function processArtistAliases(track)
{
	for(let i=0; i<track.tags.length; i++)
	{
		let tag = track.tags[i];
		if(tag.property != "artist" && tag.property != "featured artist")
			continue;

		let alias = artistAlias(tag.value)

		if(!alias)
		{
			track.tags.splice(i,1);
			i--;
			continue;
		}

		if(tag.value != alias)
		{
			tag.value = alias;
			tag.text = alias;
		}
	}
}



export {parseTitle, artistAlias, processArtistAliases};


