async function getMyLists(forceCacheReload)
{
	if(sessionStorage["myListsCache"] && !forceCacheReload)
	{
		return JSON.parse(sessionStorage["myListsCache"]);
	}

	var resp = await fetch("/api/myLists?session=" + localStorage["session"]);
	var parsedResp = await resp.json();

	if(parsedResp.status == 200)
	{
		var allLists = parsedResp.lists.map(flatten);
		sessionStorage["myListsCache"] = JSON.stringify(allLists);
		return allLists;
	}
	else
	{
		return [];
	}
}

function flatten(obj)
{
	var newObj = {};
	newObj.id = obj.id;
	for(let [p,v] of obj.properties)
	{
		if(newObj[p] == undefined)
			newObj[p] = v;
		else if(typeof newObj[p] == "object")
			newObj[p].push(v);
		else
			newObj[p] = [newObj[p], v];
	}
	return newObj;
}

export {getMyLists}