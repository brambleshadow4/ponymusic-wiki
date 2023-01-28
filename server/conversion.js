const fs = require('fs');
const csv = require('jquery-csv');
const open = require('open');
const rl = require("readline-sync");
const fetch = require("node-fetch-commonjs");


let HOST = "http://localhost:8000"; let sessionID = "1"; 
//HOST = "https://ponymusic.wiki"; sessionID = "" // DO NOT COMMIT AN ACTUAL ID HERE!

let affectedIDs = new Set([]);

doConversion();

async function doConversion()
{
	let counter = 0;

	for(let id of affectedIDs)
	{
		counter++;
		console.log(`Processing ${counter} of ${affectedIDs.size}`)
		let response = await fetch(HOST + "/api/track/" + id, {
			method:"GET",
			headers: {
				"Content-Type": "text/json",
			}
		});

		let track = await response.json();

		// rename bad album tags

		let OLD_ALBUM = `Moonlight Vapours`
		let NEW_ALBUM = "Ponies at Dawn Moonlight Vapours"

		for(let i=0; i<track.tags.length; i++)
		{
			if(track.tags[i].property == "album" && track.tags[i].value == OLD_ALBUM)
			{
				track.tags.push({property: "album", "value":NEW_ALBUM, "number": track.tags[i].number});
				track.tags.splice(i,1);
				break;
			}
		}


		// replace bad dates
		//if(track.release_date == "2022-12-10T00:00:00.000Z")
		//	continue;

		//track.release_date = "2022-12-10";

		track.session = sessionID;
		track.release_date = track.release_date.substring(0,10); // don't want to add the T.... during conversion
		response = await fetch(HOST + "/api/track", 
		{
			method: "POST",
			headers: {"Content-Type": "text/json"},
			body: JSON.stringify(track)
		});
	}
}

