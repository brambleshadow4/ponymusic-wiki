let aliases = {
	"Ponies at Dawn": "",
	"LBP": "LoneBronyProductions",
	"CantoAcrylicVA": "CantoAcrylic",
	"FenPhoenix": "FenPony",
	"Fen": "FenPony",
	"El Brony Villero": "Brony Villero",
}


function parseTitle(title)
{
	let parsedTitle = title.replace(/<\/?(span|a)[^>]*>/g,"");
	//let parseRule = localStorage.parseRule;
	let tags = [];


	let match = /(?:(.*)?(?: - | – ))?(.*)/.exec(title);

	let artists = (match[1] || "").trim();
	parsedTitle = match[2].trim();
	
	if(artists)
	{
		artists = artists.split(/,|&/g).map(x => x.trim()).filter(x => x);

		for(let artist of artists)
		{
			tags.push({property:"artist", value: artist, text: artist});	
		}
	}

	match = /.*\((?:F|f)e?a?t?\. (.*)\)/.exec(parsedTitle);
	if(!match)
	{
		match = /.*(?:F|f)e?a?t?\. (.*)/.exec(parsedTitle);
	}

	if(match && match[1])
	{
		artists = match[1].split(/,|&/g).map(x => x.trim()).filter(x => x);

		for(let artist of artists)
		{
			tags.push({property:"featured artist", value: artist , text: artist});
		}
	}

	

	return {title: parsedTitle, tags};
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


