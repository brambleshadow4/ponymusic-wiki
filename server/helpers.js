import fetch from 'node-fetch';
import fs from 'fs';



async function getOgCache(track, albumHyperlinks)
{
	if(!albumHyperlinks)
		albumHyperlinks = [];
	let hyperlinks = track.tags.filter(x => x.property == "hyperlink" && !x.number).map(x => x.value);

	let reuploadHyperlinks = track.tags.filter(x => x.property == "reupload hyperlink" && !x.number).map(x => x.value);

	let ytOffsets = track.tags.filter(x => x.property == "youtube offset").map(x => x.value);

	if(!hyperlinks.length && !albumHyperlinks.length && !reuploadHyperlinks.length && !ytOffsets.length){
		return null;
	}

	var linkOfChoice;

	for(let links of [hyperlinks, reuploadHyperlinks, ytOffsets, albumHyperlinks])
	{
		// youTube is a special case because we can lookup the embed from the URL.
		let youTubeLinks = links.filter(x => /https:\/\/www\.youtube\.com\/watch\?v=(.*)/.exec(x));

		if(youTubeLinks.length)
		{
			let qMark = youTubeLinks[0].indexOf("?");
			let baseURL = youTubeLinks[0].substring(0,qMark);
			let params = youTubeLinks[0].substring(qMark+1).split("&");

			let vid = params.filter(x => x.startsWith("v="))[0].substring(2);

			let tParams = (params.filter(x => x.startsWith("t="))[0] || "").substring(2);

			let embedLink = "https://www.youtube.com/embed/" + vid;
			if(tParams != "")
			{
				embedLink += "?start=" + tParams.replace("s","");
			}

			return {embed:embedLink, width: 560, height: 315};
		}

		// generic lookup
		
		let bandcampLinks = links.filter(x => /https:\/\/[a-zA-Z0-9]+\.bandcamp\.com.*/.exec(x));
		let soundcloudLinks = links.filter(x => x.startsWith("https://soundcloud.com"));
		let ponyfmLinks = links.filter(x => /^https:\/\/pony\.fm\/tracks\/(\d+)-/.exec(x));

		if(ponyfmLinks.length)
		{
			let ponyfmID = /^https:\/\/pony\.fm\/tracks\/(\d+)-/.exec(ponyfmLinks[0])[1];
			ponyfmLinks[0] = `https://pony.fm/t${ponyfmID}/embed`
		}

		linkOfChoice = bandcampLinks[0] || soundcloudLinks[0] || ponyfmLinks[0] || links[0];

		if(linkOfChoice)
			break;
	}

	let properties = await getOgPropertiesFromURL(linkOfChoice);
	
	if(linkOfChoice.indexOf("bandcamp.com") > -1)
	{
		console.log("og bandcamp");

		return {embed: properties["og:video"], width: 560, height: 130};
	}
	else if (linkOfChoice.indexOf("soundcloud.com") > -1)
	{
		console.log("og soundcloud");
		return {embed: properties["twitter:player"], width: 500, height: 500};
	}
	else if(properties["twitter:player"])
	{
		console.log("generic player");
		return {embed: properties["twitter:player"], width: 500, height: 500};
	}
	else if(linkOfChoice.startsWith("https://pony.fm") && properties.status == 200)
	{	
		return {embed: linkOfChoice, width: 560, height: 150};
	}
	else if (properties["og:audio"])	
	{
		console.log("og audio");
		return {audio: properties["og:audio"]};
	}

	console.log("something went wrong")

	return null;		
}


async function getOgPropertiesFromURL(url, options)
{
	let response = await fetch(url);

	let pageSRC = await response.text();

	if(response.status != 200)
		return {status: response.status}

	pageSRC = pageSRC.replace(/\n|\r|\t/g," ");

	let pattern = /<meta(\s+[-_A-Za-z0-9]+?="[^"]*"|\s+[-_A-Za-z0-9]+?='[^']*')*\/?>/g;
	let match;
	let properties = {status: response.status};

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

function areTitlesIdentical(title1, title2)
{
	let simple1 = getSimplifiedTitle(title1);
	let simple2 = getSimplifiedTitle(title2);
	let dist = damerauLevenshteinDistance(simple1, simple2);
	return dist <= 3;
}

function getSimplifiedTitle(title)
{
	let simple = title.replace(/\([^()]*\)/g,"")
	simple = simple.replace(/\[[^\[\]]*\]/g,"")

	simple = simple.toLowerCase();

	let i = simple.lastIndexOf(" w/")
	if(i != -1)
		simple = simple.substring(0, i);

	simple = simple.replace(/ - [^-]* remix/g,"");

	simple = simple.replace(/[^A-Za-z0-9 Ѐ-ӿ]/g,""); // Ѐ-ӿ is the Cyrillic alphabet
	simple = simple.replace(/ +/g," ");

	i = simple.lastIndexOf(" feat ")
	if(i != -1)
		simple = simple.substring(0, i);

	i = simple.lastIndexOf(" ft ")
	if(i != -1)
		simple = simple.substring(0, i);

	return simple;
}

function damerauLevenshteinDistance(a, b)
{
	if(a > b)
	{
		let swap = a;
		a = b
		b = swap;
	}

	let cachedValues = [...(a+"1").split("").map(x => [])]

	cachedValues[0][0] = 0;
	let i =0;
	let j = 1;

	while(cachedValues[a.length][b.length] == undefined)
	{
		let routes = [];
		if(i > 0)
			routes.push(cachedValues[i-1][j] + 1)
		if(j > 0)
			routes.push(cachedValues[i][j-1] + 1)
		if(i > 0 && j > 0)
			routes.push(cachedValues[i-1][j-1] + (a[i]==b[j] ? 0 : 1))
		if(i > 1 && j > 1 && a[i-1] == b[j] && b[j-1] == a[i])
			routes.push(cachedValues[i-2][j-2] + (a[i]==b[j] ? 0 : 1))

		cachedValues[i][j] = Math.min(...routes);

		j--;
		i++;

		if(i > a.length || j < 0)
		{
			j = i+j+1;
			i = 0;
		}
	}

	return cachedValues[a.length][b.length]
}


export {
	getOgCache,
	getOgPropertiesFromURL,
	areTitlesIdentical
}
