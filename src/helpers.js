import {PERM, hasPerm} from "./authClient.js";

export function tagComp(tag1, tag2){

	if(tag1.property == tag2.property && propertyOrder(tag1) == propertyOrder(tag2)){
		if (tag1.value > tag2.value) return 1;
		if (tag2.value > tag1.value) return -1;

		if(tag1.number == undefined && tag2.number != undefined) return -1;
		if(tag2.number == undefined && tag1.number != undefined) return 1;

		if(tag1.number > tag2.number) return 1;
		if(tag2.number > tag1.number) return -1;
		return 0;  
	}

	let k = propertyOrder(tag1) - propertyOrder(tag2);
	if(k != 0) return k;

	if (tag1.property > tag2.property) return 1;
	if (tag2.property > tag1.property) return -1;
	if(tag1.number > tag2.number) return 1;
	if(tag2.number > tag1.number) return -1;
	return 0;
}

export function addTagToTrack(track, tag)
{
	let hasTag = track.tags.filter(x => x.property == tag.property && x.value == tag.value && x.number == tag.number).length;

	if(!hasTag){
		track.tags.push(tag);
	}
}

function propertyOrder(tag){

	switch(tag.property){
		case "hyperlink": return 0 + (!!tag.number ? 4 : 0) ;
		case "reupload hyperlink": return 1 + (!!tag.number ? 4 : 0) ;
		case "youtube offset": return 2 + (!!tag.number ? 4 : 0) ;
		case "alt mix hyperlink": return 3 + (!!tag.number ? 4 : 0);

		case "artist": return 8;
		case "featured artist": return 9;
		case "original artist": return 10;
		case "pl": return 11;
		case "cover": return 12;
		case "remix": return 13;
		case "tag": return 14;
		// default
		case "hidden": return 16;
		default: return 15;

	}
}

/**
 * Returns whether the url is a youtube offset.
 */
export function isYouTubeOffset(url)
{
	let params = url.substring(url.indexOf("?")+1).split("&")
	
	return url.indexOf("youtube.com") > -1 && params.filter(x => x.startsWith("t=")).length > 0;
}

/**
 * Returns the standard version of a URL (no extra parameter, etc.) 
 * Make sure this is copied in both server and client helper.js
 **/
export function canonicalURL(url, keepYToffset)
{
	// IF YOU EDIT THIS, MAKE SURE YOU EDIT BOTH src/helpers.js AND server/helpers.js
	if(url.startsWith("https://www.youtube.com") || url.startsWith("https://youtube.com") || url.startsWith("https://youtu.be/"))
	{
		let params = url.substring(url.indexOf("?")+1).split("&");
		let tParam = params.filter(x => x.startsWith("t="))[0] || "";

		// some people add the youtube timestamps without the S at the end, so we add it back
		if(tParam != "")
		{
			let charCode = tParam[tParam.length -1].charCodeAt(0);
			if(48 <= charCode && charCode <= 57)
			{
				url += "s";
				tParam += "s";
			}
		}

		let vParam = params.filter(x => x.startsWith("v="))[0] || "";

		if(url.startsWith("https://youtu.be/"))
		{
			vParam = "v=" + url.substring("https://youtu.be/".length, url.indexOf("?"));
		}

		if(!keepYToffset)
			tParam = "";

		return "https://www.youtube.com/watch?" + vParam + (tParam != "" ? "&" + tParam : "");
	}

	let questionMark = url.indexOf("?");

	if(questionMark > -1)
		return url.substring(0, questionMark);
	return url
}


/**
 * filters: string => {noFilter: true} | {exclude: string[]} | {include: string[]}
 */
export function buildFilterQuery(filters, sort, page, includeSession)
{
	let params = [];

	if(includeSession && localStorage.session){
		params.push("session=" + localStorage.session);
	}

	if(localStorage.SHOW_ALL_TRACKS != "1" && !(sort.length && sort[0].asc == "album_no"))
	{
		params.push("hidden=false");
	}

	for(let property in filters)
	{
		if(property == "list")
		{
			params.push("list=" + encodeURIComponent(filters["list"]));
			continue;
		}

		if(filters[property].noFilter){
			delete filters[property];
			continue;
		}

		let items = filters[property].exclude || filters[property].include;
		let param = property + "=" + items.map(x => encodeURIComponent(x.replace(/,/g, ",,")));

		if(filters[property].exclude){
			param = "x_" + param;
		}

		params.push(param);
	}

	let pageQuery = "";
	if(page)
	{
		params.push("page=" + page);
	}

	if(sort.length)
	{
		params.push("sort=" + sort.map(x => (x.asc ? "^" + x.asc : "v" + x.desc)).join(","));
	}

	return "?" + params.join("&");
}

export async function getAutofill(propName, count, searchString)
{
	let body = {
		property: propName,
		value: searchString,
		count
	}

	let request = {
		method: "POST",
		headers: {"Content-Type": "text/json"},
		body: JSON.stringify(body)
	}
	
	let data = await fetch("/api/tagAutofill", request);
	let matches = await data.json();

	return matches;
}


/*
 * FLAGs:
 *  1 - Heard it
 *  2 - Listen Later
 *  3 - Skip
 */

export async function setUserFlag(trackId, flag, value)
{
	let data = {
		session: sessionStorage.session,
		track_id: trackId,
		flag,
		value
	};

	if(flag == "fav"){
		return;
	}

	let response = await (await fetch("/api/setUserFlag", {
		method: "PUT",
		headers: {"Content-Type": "text/json"},
		body: JSON.stringify(data)
	})).json();

	return response.status;
}


export function plEnumText(s)
{
	switch(s)
	{
		case "2": return ["Obvious"];
		case "1": return ["Subtle"];
		case "0": return ["None"];
		default: return [""];
	}
}


function statusIcon(s)
{
	switch(s)
	{
		case 4: return "/star-filled.svg";
		case 3: return "/rest.png";
		case 2: return "/later.png";
		case 1: return "/notes.png";
		default: return "";
	}
}

let HeardButtons = hasPerm(PERM.USER_FLAGS) ? [
	["Heard it", "/notes.png"],
	["Listen Later","/later.png"],
	["Skip","/rest.png"]
] : [];

let Columns = {}

Columns.StatusNF = {name: "", width: "25", property: "status", printFn: statusIcon, icon:true};
Columns.Status = {name: "", width: "25", property: "status", printFn: statusIcon, icon:true, filtered: false};
Columns.Title = {name: "Title", width: "200", property: "title", filtered: false};
Columns.Album = {name: "Album", width: "100", property: "album", linkTo: "/album/*", filtered: false};
Columns.AlbumNF = {name: "Album", width: "100", property: "album", linkTo: "/album/*"};
Columns.Artist = {name: "Artist", width: "200", property: "artist", filtered: false, linkTo:"/artist/*"}
Columns.ArtistNF = {name: "Artist", width: "200", property: "artist", linkTo:"/artist/*"}
Columns.Refs = {name: "Pony Refs", width: "100", property: "pl", transform: plEnumText, filtered: false};
Columns.Genre = {name: "Genre", width: "100", property: "genre",filtered: false};
Columns.GenreNF = {name: "Genre", width: "100", property: "genre"};
Columns.Tags = {name: "Tags", width: "100", property: "tag", filtered: false};
Columns.ReleasedNF = {name: "Released", width: "100", property: "release_date", transform: (x) => [x.substring(0,10)]};
Columns.Released = {name: "Released", width: "100", property: "release_date", transform: (x) => [x.substring(0,10)], filtered: false};
Columns.Hidden = {name: "Hidden", width: "25", property: "hidden", transform: (x) => x ? "✓" : "",  filtered: true}

export {Columns, HeardButtons, statusIcon};
