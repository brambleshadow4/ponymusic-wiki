import {PERM, hasPerm} from "./authClient.js";

export function tagComp(tag1, tag2){

	if(tag1.property == tag2.property){
		if (tag1.value > tag2.value) return 1;
		if (tag2.value > tag1.value) return -1;

		return 0;  
	}

	let k = propertyOrder(tag1.property) - propertyOrder(tag2.property);
	if(k != 0) return k;

	if (tag1.property > tag2.property) return 1;
	if (tag2.property > tag1.property) return -1;
	return 0;
}

function propertyOrder(prop){
	switch(prop){
		case "hyperlink": return 0;
		case "artist": return 1;
		case "featured artist": return 2;
		case "original artist": return 3;
		case "pl": return 4;
		// default
		case "cover": return 6;
		case "remix": return 7;
		default: return 5;
	}
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

	for(let property in filters)
	{
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
Columns.Refs = {name: "Refs", width: "100", property: "pl", transform: plEnumText, filtered: false};
Columns.Genre = {name: "Genre", width: "100", property: "genre",filtered: false};
Columns.GenreNF = {name: "Genre", width: "100", property: "genre"};
Columns.Tags = {name: "Tags", width: "100", property: "tag", filtered: false};
Columns.ReleasedNF = {name: "Released", width: "100", property: "release_date", transform: (x) => [x.substring(0,10)]};
Columns.Released = {name: "Released", width: "100", property: "release_date", transform: (x) => [x.substring(0,10)], filtered: false};

export {Columns, HeardButtons, statusIcon}
