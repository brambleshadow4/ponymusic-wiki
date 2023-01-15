const fs = require('fs');
const csv = require('jquery-csv');
const open = require('open');
const rl = require("readline-sync");
const fetch = require("node-fetch-commonjs");

require('dotenv').config();
const {Pool, Client} = require('pg');
const {Semaphore} = require('./semaphore.js');



let trackQueue = new Semaphore(100);
let promptQueue = new Semaphore(1);

//let HOST = "http://localhost:8000";
let HOST = "https://ponymusic.wiki"


let processedFile = fs.readFileSync("./server/skipList.txt", {encoding:'utf8', flag:'r'});
let skipURLs = new Set(processedFile.split(/\r?\n/));


let rawData = fs.readFileSync("./server/luckrock.csv", {encoding:'utf8', flag:'r'});

let db = new Pool();

csv.toArrays(rawData, {}, function(err, data){

	if(data){
		processData(data)
	}
	else
	{
		console.log("Something went wrong :( " + error);
	}

});

function stall(ms)
{
	return new Promise( (resolve,reject) => {

		setTimeout(resolve, ms);
	});
}




async function processData(data)
{
	let [col1, col2, col3, col4, col5] = [...data[0]];
	if(col1 != "Release Date" || col2 != "Artist" || col3 != "Song" || col4 != "Genre" || col5 != "URL")
	{
		console.log("Columns are not what we expect");
		console.log(data[0])
		return;
	}

	data.shift();

	let tracks = data.map(x => {return {
		date: x[0],
		artist: x[1],
		title: x[2],
		genre: x[3],
		url: x[4]
	}});

	await Promise.all(tracks.map(processTrack));
}


async function processTrack(track)
{
	
	await trackQueue.whenResourceIsAvailable(async () =>{

		let isBandcampURL =  track.url.indexOf("bandcamp.com") != -1;
		let isYoutubeURL = track.url.indexOf("youtube.com") != -1;

		// need to do artist processing

		let remixPattern = / Cover$| cover$| Remix$| remix$/;

		let newArtist = track.artist.replace(remixPattern,"");

		let shouldTagRemix = track.artist != newArtist;

		track.artist = track.artist.split(/, & |, | & /)
			.map(x => x.replace(remixPattern, ""))
			.join("\x1E");
		track.genre = track.genre.replace(/\//g, "\x1E");

		//let result = db.query("SELECT * FROM track_tags WHERE property='hyperlink' AND value=$1", [track.url]);
		//let isInDb = result.rows.length > 0;

		let body = {
			title: track.title,
			id: "new",
			tags: [{
				property: "hyperlink",
				value: track.url
			}]
		};

		if(skipURLs.has(track.url))
			return;

		let isInDb = false;

		try 
		{
			let response = await fetch(HOST + "/api/getTrackWarnings", {
				method:"POST",
				headers: {
					"Content-Type": "text/json",
				},
				body: JSON.stringify(body)
			})

			response = await response.json();

			isInDb = response.sameHyperlink.length > 0;
		}
		catch(e)
		{
			console.log("getTrackWarnings request failed for URL: " + track.url);
			return;
		}


		if(isInDb)
		{
			return;
		}

		if(isBandcampURL && track.url.indexOf("/track/") == -1)
		{
			console.log("URL doesn't look like a track URL");
			console.log(track);
			
			return;
		}

		if(!isYoutubeURL && !isBandcampURL)
		{
			console.log("weird URL");
			console.log(track);
			return;
		}

		
	

		let params = "?title=" + encodeURIComponent(track.title) 
			+ "&date=" + encodeURIComponent(track.date) 
			+ "&artist=" + encodeURIComponent(track.artist) 
			+ "&genre=" + encodeURIComponent(track.genre)
			+ "&url=" + encodeURIComponent(track.url);

		await promptQueue.whenResourceIsAvailable(async function()
		{
			if(shouldTagRemix)
			{
				console.log("-------------------")
				console.log(" REMIX TRACK ")
				console.log("-------------------")
			}


			open(HOST + "/track/new" + params);
			await stall(500);
			rl.question(`Opening ${track.url}. Press enter to continue`);

		});
	});
}

