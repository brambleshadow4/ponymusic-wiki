const fetch = require('node-fetch');
const fs = require('fs');

async function getOgCache(track)
{
	let hyperlinks = track.tags.filter(x => x.property == "hyperlink").map(x => x.value);

	if(!hyperlinks.length){
		return null;
	}
	
	// youTube is a special case because we can lookup the embed from the URL.
	let youTubeLinks = hyperlinks.filter(x => /https:\/\/www\.youtube\.com\/watch\?v=(.*)/.exec(x));

	if(youTubeLinks.length)
	{
		let pattern = /https:\/\/www\.youtube\.com\/watch\?v=(.*)/;
		let match = pattern.exec(youTubeLinks[0])

		return {embed:"https://www.youtube.com/embed/" + match[1], width: 560, height: 315};
	}

	// generic lookup
	
	let linkOfChoice = hyperlinks[0];
	let bandcampLinks = hyperlinks.filter(x => /https:\/\/[a-zA-Z0-9]+\.bandcamp\.com.*/.exec(x));
	let soundcloudLinks = hyperlinks.filter(x => x.startsWith("https://soundcloud.com"));

	if(bandcampLinks.length){
		linkOfChoice = bandcampLinks[0]
	}
	else if(soundcloudLinks.length){
		linkOfChoice = soundcloudLinks[0];
	}

	let properties = await getOgPropertiesFromURL(linkOfChoice);

	//console.log(properties);

	if(bandcampLinks.length)
	{
		console.log("og bandcamp");

		return {embed:properties["og:video"], width: 560, height: 130};
	}
	else if (soundcloudLinks.length)
	{
		console.log("og soundcloud");
		return {embed:properties["twitter:player"], width: 500, height: 500};
	}
	else if(properties["twitter:player"])
	{
		console.log("generic player");
		return {embed:properties["twitter:player"], width: 500, height: 500};
	}
	else if (properties["og:audio"])	
	{
		console.log("og audio");
		return {audio: properties["og:audio"]};
	}

	return null;		
}


async function getOgPropertiesFromURL(url, options)
{
	let pageSRC = await (await fetch(url)).text();
	pageSRC = pageSRC.replace(/\n|\r|\t/g," ");

	let pattern = /<meta(\s+[-_A-Za-z0-9]+?="[^"]*"|\s+[-_A-Za-z0-9]+?='[^']*')*\/?>/g;
	let match;
	let properties = {};

	while(match = pattern.exec(pageSRC))
	{
		let keyValue = /([-_A-Za-z0-9]+?)="([^"]*)"|([-_A-Za-z0-9]+?)='([^']*)'/g;
		let kvp;
		let metaTag = {};

		while(kvp = keyValue.exec(match[0]))
		{		
			let key = kvp[1] || kvp[3];
			let value = kvp[2] || kvp[4];
			metaTag[key] = value;
		}

		let key = metaTag.name || metaTag.property;
		
		properties[key] = metaTag.content;
	}

	if(options && options.logProperties)
	{
		console.log(properties);
	}

	return properties;
}


module.exports = {
	getOgCache,
	getOgPropertiesFromURL
}