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
		case "pl": return 3;
		default: return 4;
	}
}


/**
 * filters: string => {noFilter: true} | {exclude: string[]} | {include: string[]}
 */
export function buildFilterQuery(filters, page, includeSession)
{
	let params = [];

	if(includeSession && sessionStorage.session){
		params.push("session=" + sessionStorage.session);
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
