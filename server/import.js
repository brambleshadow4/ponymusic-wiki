import fs from 'fs';
import csv from 'jquery-csv';
import open from 'open';
import rl from "readline-sync";
import fetch from "node-fetch";
import dotenv from "dotenv"; dotenv.config();
import pg from "pg";
import readline from 'readline';
import pro from 'process';
const {Pool, Client} = pg;
import Semaphore from './semaphore.js';
import {parseTitle, processArtistAliases} from "../src/titleParsing.js";


let LIMIT = 1000;
let SESSION = process.env.PROD_SESSION || "";


let trackQueue = new Semaphore(100);
let promptQueue = new Semaphore(1);

//let HOST = "http://localhost:8000";
let HOST = "https://ponymusic.wiki";

let albumURLs = new Set();

let localDb = new Pool();

main();

var consoleInterface;


async function main()
{

	consoleInterface = readline.createInterface({ input: pro.stdin, output: pro.stdout });
	
	console.clear();
	console.log("+------Ponymusic.wiki IMPORT------+");
	console.log("|  1. From luckrock.csv           |")         
	console.log("|  2. From brass.json             |");
	console.log("+---------------------------------+")

	var tracks = [];

	let option = await read(">");

	if(option == "1")
		tracks = loadFromLuckRock();
	if(option == "2")
		tracks = loadFromBrassScribe();

	// pick data source

	await Promise.all(tracks.map(processTrack));

	console.log("album URLS:")
	for(let link of albumURLs)
	{
		console.log(link)
	}
}

function loadFromLuckRock()
{
	let rawData = fs.readFileSync("./server/luckrock.csv", {encoding:'utf8', flag:'r'});

	let rv = [];

	csv.toArrays(rawData, {}, function(err, data)
	{

		if(data)
		{
			let [col1, col2, col3, col4, col5] = [...data[0]];

			if(col1 != "Release Date" || col2 != "Artist" || col3 != "Song" || col4 != "Genre" || col5 != "URL")
			{
				console.error("Columns are not what we expect");
				console.error(data[0])
				return [];
			}

			data.shift();

			let tracks = data.map(function(x){

				let [date, artist, title, genre, url] = x;

				let tags = [
					{property: "hyperlink", value: url, text: url}
				];

				let remixPattern = / Cover$| cover$| Remix$| remix$/g;

				let newArtist = artist.replace(remixPattern,"");

				if (newArtist.endsWith(" AI"))
				{
					tags.push({property:"tag", value:"AI", text:"AI"});
					newArtist = newArtist.substring(0, newArtist.length-3);
				}


				tags = tags.concat(artistToArtistTags(newArtist));

				if(genre)
				{
					tags = tags.concat(genre.split("/").map(y => {return {property:"genre", value: y, text: y}}));
				}

				

				let release_date = new Date(date).toISOString().substring(0,10);

				return {title, release_date, tags};
			});

			rv = tracks;
		}
		else
		{
			console.log("Something went wrong :( " + error);
		}

	});

	return rv;


}

function loadFromBrassScribe()
{
	let rawData = fs.readFileSync("./server/brass.json", {encoding:'utf8', flag:'r'});

	let data = JSON.parse(rawData);

	return data.map(row => {

		let tags = artistToArtistTags(row.artist);
		tags.push({property: "hyperlink", value: row.url, text: row.url})

		return {
			title: row.title,
			release_date: row.date,
			tags
		}
	})
}


function artistToArtistTags(artistCombined)
{
	return artistCombined.split(/, & |, | & /g).map(x => {return {property:"artist", value: x, text: x}})
}


function stall(ms)
{
	return new Promise( (resolve,reject) => {
		setTimeout(resolve, ms);
	});
}


async function processTrack(track)
{
	await trackQueue.whenResourceIsAvailable(async () =>{

		if (LIMIT <= 0)
			return;

		let url = track.tags.filter(x => x.property == "hyperlink")[0].value;

		if(url.value == "")
			return;

		let isBandcampURL =  url.indexOf("bandcamp.com") != -1;
		let isYoutubeURL = url.indexOf("youtube.com") != -1;

		// local DB check.

		let result = await localDb.query("SELECT * FROM track_tags WHERE property='hyperlink' AND value=$1", [url]);

		if(result.rows.length > 0)
			return;

		let result2 = await localDb.query("SELECT * FROM tag_metadata WHERE type='album' AND property='hyperlink' AND value=$1", [url]);

		if(result2.rows.length > 0)
			return;

		let stuff = parseTitle(track.title);
		track.title = stuff.title;
		track.tags = track.tags.concat(stuff.tags);

		processArtistAliases(track);

		let lower = track.title.toLowerCase();
		if(lower.indexOf("remix") >= 0 || lower.indexOf("vip") >= 0 || lower.indexOf("flip") >=0 || lower.indexOf("bootleg") >=0 || lower.indexOf("cover") >=0)
		{
			track.tags.push({property:"tag", value:"x-needs-remixcover-linking", text: "x-needs-remixcover-linking"});
		}

		track.id = "new";


		let trackWarnings = {};
		let responseCache = null;
		try 
		{
			let response = await fetch(HOST + "/api/getTrackWarnings", {
				method:"POST",
				headers: {
					"Content-Type": "text/json",
				},
				body: JSON.stringify(track)
			})

			responseCache = response;
			trackWarnings = await response.json();

			if(trackWarnings.status == 400)
			{
				console.log(track)
				console.error(trackWarnings.error);
				return;
			}
		}
		catch(e)
		{
			console.log(e);
			console.log("getTrackWarnings request failed for URL: " + url);
			return;
		}

		if(trackWarnings.sameHyperlink.length > 0)
			return;

		if(trackWarnings.albumHyperlink.length > 0)
			return;

		if(isBandcampURL && url.indexOf("/track/") == -1)
		{
			albumURLs.add(url);
			//console.log(track);
			
			return;
		}

		let isSoundCloudURL = url.indexOf("soundcloud.com") > -1;

		if(!isYoutubeURL && !isBandcampURL && !isSoundCloudURL)
		{
			console.log("weird URL");
			console.log(track);
			return;
		}

		// remove duplicate tags
		let tagSet = new Set()
		
		for(let i=0; i < track.tags.length; i++)
		{
			let tag = track.tags[i];
			let str = tag.property + ":" + tag.value + ":" + tag.number;
			if(tagSet.has(str))
			{
				track.tags.splice(i,1);
				i--;
			}
			else
			{
				tagSet.add(str)
			}
		}

		await promptQueue.whenResourceIsAvailable(async function()
		{
			if (LIMIT <= 0)
				return;

			if(trackWarnings.warnings)
			{
				//return;
				await openTrackInBrowser(track);
			}
			else
			{
				await addTrackDirectly(track);
			}

			LIMIT--;
		});
	});
}

async function addTrackDirectly(track)
{
	console.log(`DIRECT ADD ${track.title}`)

	track.session = SESSION;

	let response = await fetch(HOST + "/api/track", 
	{
		method: "POST",
		headers: {"Content-Type": "text/json"},
		body: JSON.stringify(track)
	});

	let respObj = await response.json();

	if(respObj.status != 200)
	{
		console.error(respObj.error);

		console.log(track);
		process.exit();
	}
}

async function openTrackInBrowser(track)
{
	let params = "?trackPost=" + encodeURIComponent(JSON.stringify(track));

	open(HOST + "/track/new" + params);
	await stall(500);
	rl.question(`Opening ${track.title}. Press enter to continue`);
}

async function read(prompt)
{
	prompt = prompt || "";
	return new Promise((accept, reject)=> {
		consoleInterface.question(prompt, accept);
	})
}