const fs = require('fs');
const csv = require('jquery-csv');
const open = require('open');
const rl = require("readline-sync");
const fetch = require("node-fetch-commonjs");

//let HOST = "https://ponymusic.wiki";
let HOST = "http://localhost:8000";

let sessionID = "1" // DO NOT COMMIT AN ACTUAL ID HERE!
let affectedIDs = new Set([3007,3021,2968,3028,3026,2976,3014,2979,2972,2971,3016,2973,3010,3004,3032,2967,3002,3029,3038,3006,2977,3018,3008,3037,3020,2996,2966,2970,2985,3034,3000,2981,3031,2988,2978,3025,2980,3023,2998,2994,2987,3005,2986,3017,2999,2963,2975,2995,2983,3027,3035,3011,2984,2990,2997,3019,3013,2974,3003,3009,2993,3022,2992,3030,2969,3033,3015,3012,2991,2989,3036,3039,3001,2964,2982,2965])

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

		if(track.release_date == "2022-12-10T00:00:00.000Z")
			continue;

		track.release_date = "2022-12-10";
		track.session = sessionID;
	
		response = await fetch(HOST + "/api/track", 
		{
			method: "POST",
			headers: {"Content-Type": "text/json"},
			body: JSON.stringify(track)
		});
	}
}

