const fs = require('fs');
const csv = require('jquery-csv');
const open = require('open');
const rl = require("readline-sync")

require('dotenv').config();
const {Pool, Client} = require('pg');


let HOST = "http://localhost:8000";

let rawData = fs.readFileSync("./server/luckrock.csv", {encoding:'utf8', flag:'r'});

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
	let db = new Pool();

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

	for(let track of tracks)
	{
		let result = await db.query("SELECT * FROM track_tags WHERE property='hyperlink' AND value=$1", [track.url])
		let isInDb = result.rows.length > 0;

		let isBandcampURL =  track.url.indexOf("bandcamp.com") != -1;
		let isYoutubeURL = track.url.indexOf("youtube.com") != -1;

		if(!isInDb && isBandcampURL && track.url.indexOf("/track/") == -1)
		{
			console.log("URL doesn't look like a track URL");
			console.log(track);
			continue;
		}

		if(!isInDb && !isYoutubeURL && !isBandcampURL)
		{
			console.log("weird URL");
			console.log(track);
			continue;
		}

		// need to do artist processing

		track.artist = track.artist.split(/, & |, | & /)
			.map(x => x.replace(/ Cover$| cover$| Remix$| remix/,""))
			.join("\x1E");
		track.genre = track.genre.replace(/\//g, "\x1E");


		let params = "?title=" + encodeURIComponent(track.title) 
			+ "&date=" + encodeURIComponent(track.date) 
			+ "&artist=" + encodeURIComponent(track.artist) 
			+ "&genre=" + encodeURIComponent(track.genre)
			+ "&url=" + encodeURIComponent(track.url);

		open(HOST + "/track/new" + params);

		await stall(500);

		rl.question(`Opening ${track.url}. Press enter to continue`);

		//check if bandcamp url has 
	}


}

