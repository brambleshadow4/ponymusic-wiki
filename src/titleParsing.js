
function parseTitle(title)
{
	let nameOverrides = getNameOverrides();
	let parsedTitle = title.replace(/<\/?(span|a)[^>]*>/g,"");
	let parseRule = localStorage.parseRule;
	let tags = [];

	if(parseRule == "0")
	{
		return {title: parsedTitle, tags};
	}

	let match = /(?:(.*)?(?: - | – ))?(.*)/.exec(title);

	let artists = (match[1] || "").trim();
	parsedTitle = match[2].trim();
	
	if(artists)
	{
		artists = artists.split(/,|&/g).map(x => x.trim()).filter(x => x);

		for(let artist of artists)
		{
			let name = getArtistName(artist, nameOverrides);
			if(name)
				tags.push({property:"artist", value: name , text: name});
		}
	}

	match = /.*\((?:F|f)e?a?t?\. (.*)\)/.exec(parsedTitle);
	if(match && match[1])
	{
		artists = match[1].split(/,|&/g).map(x => x.trim()).filter(x => x);

		for(let artist of artists)
		{
			let name = getArtistName(artist, nameOverrides);
			if(name)
				tags.push({property:"featured artist", value: name , text: name});
		}
	}

	return {title: parsedTitle, tags};
}

function getArtistName(artistName, overrides)
{
	if(!overrides)
		overrides = getNameOverrides();
	return overrides[artistName] != undefined ? overrides[artistName] : artistName;
}


function getNameOverrides()
{
	let nameOverrides = {};
	let nameOverridesRaw = [];
	try{
		nameOverridesRaw = JSON.parse(localStorage.nameOverrides)
	}
	catch(e){};

	for(let pair of nameOverridesRaw)
	{
		nameOverrides[pair[0]] = pair[1];
	}

	return nameOverrides;
}



export {parseTitle, getArtistName};


