
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
		match = /(.*) fe?a?t\. (.*)/.exec(artistList)
		if(match)
		{
			artistList = match[1].split(/,|&| and /g).map(x => x.trim()).filter(x => x);
			for(let artist of artistList)
			{
				tags.push({property:"artist", value: artist, text: artist});	
			}

			artistList = match[2].split(/,|&| and /g).map(x => x.trim()).filter(x => x);
			for(let artist of artistList)
			{
				tags.push({property:"featured artist", value: artist, text: artist});	
			}
		}
		else
		{
			artistList = artistList.split(/,|&| and /g).map(x => x.trim()).filter(x => x);

			for(let artist of artistList)
			{
				tags.push({property:"artist", value: artist, text: artist});	
			}
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

		match = /.*(?:w|W)\/ (.*)/.exec(songName);

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



function parseImportParams(queryString, now = new Date())
{
	let params = {};
	for(let param of queryString.split("&"))
	{
		let [key, value] = param.split("=");
		if(key)
			params[key] = decodeURIComponent(value ?? "").replace(/&amp;/g, "&");
	}

	let title = "";
	let release_date = "";
	let scrapedTitle = "";
	let tags = [];

	if(params['trackPost'])
	{
		let newTrack = JSON.parse(decodeURIComponent(params['trackPost']));
		title = newTrack.title;
		release_date = newTrack.release_date;
		newTrack.tags.forEach(x => tags.push(x));
	}

	if(params['artist'])
	{
		params['artist']
			.split(/\\x1E| and \d more| and /)
			.map(x => x.replace(/<svg .*<\/svg>/g,""))
			.map(x => x.replace(/<\/?(span|a|div)[^>]*>/g,""))
			.map(x => x.trim())
			.filter(x => x.length > 0)
			.forEach(x => {
				tags.push({property:"artist", value: x, text: x});
			});
	}

	if(params['genre'])
	{
		params['genre'].split("\x1E").map(x => x.trim())
			.forEach(x => tags.push({property: "genre", value: x, text: x}));
	}

	if(params['url'])
	{
		let url = params['url'];
		let qmark = url.indexOf("?");

		if(url.indexOf("youtube.com") > -1)
		{
			let urlParamsDic = {};
			for(let pair of url.substring(qmark+1).split("&"))
			{
				let [key, value] = pair.split("=");
				urlParamsDic[key] = value;
			}

			if(urlParamsDic.v)
			{
				url = url.substring(0,qmark+1) + "v=" + urlParamsDic.v;
			}
		}
		else
		{
			if(qmark > -1)
			{
				url = url.substring(0,qmark);
			}
		}

		tags.push({property: "hyperlink", value: url, text: url});
	}

	if(params['title'])
	{
		scrapedTitle = params['title'].replace(/<\/?(span|a)[^>]*>/g,"");
		let result = parseTitle(scrapedTitle);

		title = result.title;
		for(let tag of result.tags)
		{
			tags.push(tag);
		}
	}

	if(params['date'])
	{
		let rawDate = params['date'].toLowerCase();
		rawDate = rawDate.replace("premiered ", "");

		let match = /.*((january|february|march|april|may|june|july|august|september|october|november|december) \d\d?, \d\d\d\d).*/.exec(rawDate)

		if(match)
		{
			rawDate = match[1];
		}

		if(rawDate.indexOf("hours ago") > -1)
		{
			let d = now;
			release_date = new Date(d.getTime() - 1000*60*d.getTimezoneOffset()).toISOString().substring(0,10);
		}
		else
		{
			let d = new Date(rawDate);
			if (d.toISOString().substring(10) != "T00:00:00.000Z")
			{
				d = new Date(d.getTime() - d.getTimezoneOffset()*1000*60)
			}
			release_date = d.toISOString().substring(0,10)
		}
	}

	return { title, release_date, scrapedTitle, tags };
}

export {parseTitle, parseImportParams};


