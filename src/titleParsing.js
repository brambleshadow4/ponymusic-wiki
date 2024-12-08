
function parseTitle(title)
{
	let parsedTitle = title.replace(/<\/?(span|a)[^>]*>/g,"");
	//let parseRule = localStorage.parseRule;
	let tags = [];

	let parsedTitleLowerCase = parsedTitle.toLowerCase();

	if(parsedTitleLowerCase.indexOf("vip") > -1 
		|| parsedTitleLowerCase.indexOf("remix") > -1 
		|| parsedTitleLowerCase.indexOf("cover") > -1)
		tags.push({property:"tag",value:"x-needs-remixcover-linking", text:"x-needs-remixcover-linking"});


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



export {parseTitle};


