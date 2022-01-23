const fetch = require('node-fetch');
const fs = require('fs');

async function addOgCacheTag(track)
{
	track.tags = track.tags.filter(x => !x.property.startsWith("ogcache_"));

	let hyperlinks = track.tags.filter(x => x.property == "hyperlink").map(x => x.value);

	if(!hyperlinks.length){
		return track;
	}
	
	// youTube is a special case because we can lookup the embed from the URL.
	let youTubeLinks = hyperlinks.filter(x => /https:\/\/www\.youtube\.com\/watch\?v=(.*)/.exec(x));

	if(youTubeLinks.length)
	{
		let pattern = /https:\/\/www\.youtube\.com\/watch\?v=(.*)/;
		let match = pattern.exec(youTubeLinks[0])

		track.tags.push({property: "ogcache_embed", value: "https://www.youtube.com/embed/" + match[1]});
		track.tags.push({property: "ogcache_width", value: 560});
		track.tags.push({property: "ogcache_height", value: 315});
		return track;
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
		track.tags.push({property: "ogcache_embed", value: properties["og:video"]});
		track.tags.push({property: "ogcache_width", value: 560});
		track.tags.push({property: "ogcache_height", value: 130});
	}
	else if (soundcloudLinks.length)
	{
		console.log("og soundcloud");
		track.tags.push({property: "ogcache_embed", value: properties["twitter:player"]});
		track.tags.push({property: "ogcache_width", value: 500});
		track.tags.push({property: "ogcache_height", value: 500});
	}
	else if(properties["twitter:player"])
	{
		console.log("generic player");
		track.tags.push({property: "ogcache_embed", value: properties["twitter:player"]});
		track.tags.push({property: "ogcache_width", value: 500});
		track.tags.push({property: "ogcache_height", value: 500});
	}
	else if (properties["og:audio"])	
	{
		console.log("og audio");
		track.tags.push({property: "ogcache_audio", value: properties["og:audio"]});
	}

	console.log(track.tags);

	return track;
		
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
	addOgCacheTag,
	getOgPropertiesFromURL
}