import fs from 'fs';
import csv from 'jquery-csv';
import open from 'open';
import rl from "readline-sync";
import fetch from "node-fetch-commonjs";
import pg from "pg";
let {Pool} = pg;

let HOST = "https://ponymusic.wiki";
let sessionID = "" // DO NOT COMMIT AN ACTUAL ID HERE!

doConversion();

async function doConversion()
{
	let commit = process.argv.indexOf("--commit") > -1;

	let counter = 0;
	
	let db = new Pool({
		host: "ponymusic.wiki",
		user: "octavia",
		database: "ponymusic"
	});

	let response = await db.query(`
		SELECT * 
		FROM tracks LEFT JOIN track_tags ON tracks.id = track_tags.track_ID
		WHERE property='featured artist' AND value='namii'
		--AND hidden=false
	`)

	let affectedIDs = response.rows.map(x => x.id);

	for(let id of affectedIDs)
	{
		counter++;
		console.log(`Processing ${counter} of ${affectedIDs.length}`)
		let response = await fetch(HOST + "/api/track/" + id, {
			method:"GET",
			headers: {
				"Content-Type": "text/json",
			}
		});

		let affected = false;
		let track = await response.json();
		let oldTrackCopy = JSON.parse(JSON.stringify(track));


		// remove a hole in an album.

		/*let ALBUM = "Aura - Tw3Lv3";
		let holeNumber = 7;

		for(let i=0; i<track.tags.length; i++)
		{
			if(track.tags[i].property == "album" && track.tags[i].value == ALBUM && track.tags[i].number > holeNumber)
			{
				track.tags.push({property: "album", "value":ALBUM, "number": track.tags[i].number-1});
				track.tags.splice(i,1);
				affected = true;
				break;
			}
		}*/

		// add a hole to an album

		/*let ALBUM = "Ponies at Dawn Zenith";
		let holeNumber = 13;

		for(let i=0; i<track.tags.length; i++)
		{
			if(track.tags[i].property == "album" && track.tags[i].value == ALBUM && track.tags[i].number >= holeNumber)
			{
				track.tags.push({property: "album", "value":ALBUM, "number": track.tags[i].number+1});
				track.tags.splice(i,1);
				affected = true;
				break;
			}
		}*/


		// replace one tag  with another

		let TAG = "featured artist"
		let OLD_VALUE = `namii`
		let NEW_VALUE = "Namii"

		for(let i=0; i<track.tags.length; i++)
		{
			if(track.tags[i].property == TAG && track.tags[i].value == OLD_VALUE)
			{
				track.tags.push({property: TAG, "value":NEW_VALUE, "number": track.tags[i].number});
				track.tags.splice(i,1);
				affected = true;
				i--;
			}
		}
		

		// Add a tag
		//track.tags.push({property: "tag", "value":"ASOS"});
		//affected = true;

		// replace bad dates
		//if(track.release_date == "2022-12-10T00:00:00.000Z")
		//	continue;

		//track.release_date = "2022-12-10";


		if(!affected)
			continue;

		
		if(!commit)
		{
			prettyPrintTrack(oldTrackCopy)
			prettyPrintTrack(track)
			console.log("\n\n");
			continue;
		}

		track.session = sessionID;
		track.release_date = track.release_date.substring(0,10); // don't want to add the T.... during conversion
		response = await fetch(HOST + "/api/track", 
		{
			method: "POST",
			headers: {"Content-Type": "text/json"},
			body: JSON.stringify(track)
		});
	}

	if(!commit)
		console.log("To commit these changes, rerun the script with --commit");
}

function prettyPrintTrack(track)
{
	if(track.hidden)
		console.log("[Hidden]");
	console.log(track.titlecache + "[" + track.release_date.substring(0,10) + "]");
	
	for(let x of track.tags)
	{
		console.log("  " + x.property+":" + x.value+(x.number ? ":" + x.number : ""));	
	}

}