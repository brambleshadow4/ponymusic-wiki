export default {doLoad, doPull, doExport, doExcelExport, doRdfExport, makeCopy};

import fs from 'fs';
import ExcelJS from 'exceljs'
import https from "https"
import pg from "pg";
import dotenv from "dotenv";
import {exec} from "child_process";

dotenv.config();

const {Pool, Client} = pg;

var poolConfig = {
	database: "ponymusiccopy",
}

function makeCopy()
{
	return new Promise((accept, reject)=> {
		exec('sudo -u postgres /home/postgres/backup.sh',
			function (error, stdout, stderr) {

				console.log("we finished running the script :> ")
				if (error !== null) {
					console.log('exec error: ' + error);
				}
				accept();
			});
	});
}


async function doLoad(filename)
{
	let tableQueries = fs.readFileSync(filename, {encoding:'utf8'}).split(";\n").map(x => x.replace(/\n/g, " "));

	let db = new Pool(poolConfig);
	
	for(let query of tableQueries)
	{
		let {rows, err} = await db.query(query);
	}
}

async function doPull()
{
	return new Promise(async function(res,rej){

		let filename = "PROD " + new Date().toISOString().substring(0,10) + ".sql";

		console.log("Pulling from ponymusic.wiki");

		const file = fs.createWriteStream(filename);

		const request = https.get("https://ponymusic.wiki/export/db?PULL_KEY=" + process.env.PULL_KEY, function(response)
		{
			response.pipe(file);

			response.on('data', (d) => {
				//process.stdout.write(d);
			});

			// after download completed close filestream
			file.on("finish", async () => {
				file.close();
				console.log("Download Complete");

				await doLoad(filename);

				console.log("Import Complete")

				res();
			});
		}).on("error", function(e){

			throw(e);

			rej();

		});

	});
}

function sqlEscapeString(s)
{
	if(s == null || s == undefined){
		return "''";
	}
	if(!s.replace)
	{
		console.log(s);
	}

	//s = s.replace(/\\/g, "\\\\");
	s = s.replace(/'/g, "''");
	// s = s.replace(/%/g,"\\%"); This escape doesn't work
	//s = s.replace(/\n/g,"\\n");

	return "'" + s + "'";
}

function escapeJSON(s)
{
	s = s.replace(/'/g, "''");
	return "'" + s + "'";
}

async function doExport()
{
	let now = new Date();
	let textArr = [];

	let stream = fs.createWriteStream("./fullExport.sql");
	
	await exportTable(stream, "users", {id: "string", name: "string", role: "number", avatar: "string"});
	await exportTable(stream, "tracks", {id: "number", title: "string", release_date: "date", locked: "bool", ogcache: "json", titlecache:"string", hidden: "bool"});
	await exportTable(stream, "track_tags", {track_id: "number", property: "string", value:"string", number: "number|null"});
	await exportTable(stream, "track_history", {track_id: "number", user_id: "string", value:"json", timestamp: "date"});
	await exportTable(stream, "user_flags", {track_id: "number", user_id: "string", flag:"string", value:"number"});
	await exportTable(stream, "tag_metadata", {type: "string", id:"string", property:"string", value:"string"});
	await exportTable(stream, "tag_metadata_history", {user_id: "string", timestamp: "date", type:"string", id:"string", value:"json"});


	stream.write("SELECT SETVAL(pg_get_serial_sequence('tracks', 'id'), (SELECT (MAX(track_id) + 1) FROM track_history));\n")
	stream.end();

	// public export
	stream = fs.createWriteStream("./public/export/pmw.sql");
	stream.write("-- This data was exported on " + new Date().toISOString());
	publicTables(stream)
	await exportTable(stream, "tracks", {id: "number", title: "string", release_date: "date", ogcache: "json", titlecache:"string", hidden: "bool"});
	await exportTable(stream, "track_tags", {track_id: "number", property: "string", value:"string", number: "number|null"});
	await exportTable(stream, "tag_metadata", {type: "string", id:"string", property:"string", value:"string"});
	stream.end();
	//fs.writeFileSync("./public/export/pmw.sql", publicCopyArr.join(""));
}


async function doExcelExport()
{
	console.log("exporting excel")
	
	let options = {
		filename: './public/export/pmw.xlsx',
		useStyles: true,
		useSharedStrings: true
	};

	let workbook = new ExcelJS.stream.xlsx.WorkbookWriter(options);

	let db = new Pool(poolConfig);
	var sheet, data, excelRow

	// Tracks
		sheet = workbook.addWorksheet('Tracks', {
			views: [{
				state: 'frozen',
				ySplit: 1
			}],
			autoFilter: "A1:M1"
		});

		
		data = await db.query(`
			SELECT id2, title, release_date, hidden,
				(SELECT COALESCE(string_agg(value, ', '), '') FROM track_tags WHERE track_id=id2 AND property='artist') AS artist,
				(SELECT COALESCE(string_agg(value, ', '), '') FROM track_tags WHERE track_id=id2 AND property='featured artist') AS featured_artist, 
				(SELECT COALESCE(string_agg(value, ', '), '') FROM track_tags WHERE track_id=id2 AND property='hyperlink') AS hyperlink,
				(SELECT COALESCE(string_agg(value, ', '), '') FROM track_tags WHERE track_id=id2 AND property='genre') AS genre,
				(SELECT COALESCE(string_agg(value, ', '), '') FROM track_tags WHERE track_id=id2 AND property='tag') AS tag,
				(SELECT COALESCE(value, '') FROM track_tags WHERE track_id=id2 AND property='pl') AS pl,
				(SELECT COALESCE(string_agg(titlecache, ', '), '') as remix_of FROM tracks WHERE id IN 
					(SELECT value::int FROM track_tags WHERE track_id=id2 AND property='remix')),
				(SELECT COALESCE(string_agg(id::varchar(10), ', '), '') as remix_of_id FROM tracks WHERE id IN 
					(SELECT value::int FROM track_tags WHERE track_id=id2 AND property='remix')),
					
				(SELECT COALESCE(string_agg(titlecache, ', '), '') as cover_of FROM tracks WHERE id IN 
					(SELECT value::int FROM track_tags WHERE track_id=id2 AND property='cover')),
				(SELECT COALESCE(string_agg(id::varchar(10), ', '), '') as cover_of_id FROM tracks WHERE id IN 
					(SELECT value::int FROM track_tags WHERE track_id=id2 AND property='cover'))

			FROM 
				(SELECT id as id2, title, release_date, hidden FROM tracks
					ORDER BY release_date
					ASC
				) as innerTable
		

			`);


		sheet.addRow([
			"ID",
			"Release Date",
			"Artist",
			"Title",
			"Hyperlink",
			"Featured Artist",
			"Genre",
			"Tag",
			"Pony Refernces",
			"Remix of ID",
			"Remix of",
			"Cover of ID",
			"Cover of"
		]).commit();

		for(let i =0; i < data.rows.length; i++)
		{
			let row = data.rows[i];
			sheet.addRow([
				row.id2,
				row.release_date,
				row.artist,
				row.title,
				row.hyperlink,
				row.featured_artist,
				row.genre,
				row.tag,
				plMap(row.pl),
				row.remix_of_id,
				row.remix_of,
				row.cover_of_id,
				row.cover_of
			]).commit();
		}

		sheet.commit();

		let trackCount = data.rows.length

	// Albums
		sheet = workbook.addWorksheet('Albums', {
			views: [{
				state: 'frozen',
				ySplit: 1
			}],
			autoFilter: "A1:F1"
		});

		data = await db.query(`SELECT * FROM track_tags WHERE property='album'`);

		sheet.addRow([
			"Album",
			"Track No",
			"Track ID",
			"Artist",
			"Title",
			"Hyperlink"
		]).commit();

		for(let i =0; i < data.rows.length; i++)
		{
			let row = data.rows[i];
			excelRow = sheet.addRow([
				row.value,
				row.number,
				row.track_id,
				{formula: `_xlfn.XLOOKUP(C${i+2},Tracks!$A$2:$A$${trackCount+1},Tracks!$C$2:$C$${trackCount+1})`},
				{formula: `_xlfn.XLOOKUP(C${i+2},Tracks!$A$2:$A$${trackCount+1},Tracks!$D$2:$D$${trackCount+1})`},
				{formula: `_xlfn.XLOOKUP(C${i+2},Tracks!$A$2:$A$${trackCount+1},Tracks!$E$2:$E$${trackCount+1})`}
			]).commit()
			
		}
		sheet.commit();

	await workbook.commit();
}

function dateToString(date)
{
	let month = date.getMonth();
	month = month < 10 ? "0" + month : "" + month;
	let day = date.getDate();
	day = day < 10 ? "0" + day : "" + day;
	return date.getFullYear() + "-" + month + "-" + day;
}

function turtleEncode(s)
{
	if(/[^a-zA-Z]/.exec(s))
	{
		return s.split("").map(x => {
			let cp = x.codePointAt(0);
			if((97 <= cp && cp <=122) || (65 <= cp && cp <= 90)) 
				return x;
			let k = cp.toString(16)
			return k.length == 1 ? "%0" + k : "%" + k;
		}).join("");
	}
	return s;
}

async function doRdfExport()
{
	let db = new Pool(poolConfig);
	let file = fs.openSync("./public/export/pmw.ttl","w");

	let buf = new Buffer.from(`@prefix pmw: <http://ponymusic.wiki/ns#> .
@prefix artist: <http://ponymusic.wiki/artist/> .
@prefix album: <http://ponymusic.wiki/album/> .
@prefix track: <http://ponymusic.wiki/track/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dc: <http://purl.org/dc/elements/1.1/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
`)
	fs.writeSync(file, buf)

	let results = await db.query(`
		SELECT id, title, release_date, hidden
		FROM tracks
	`);

	for(let row of results.rows)
	{
		buf = new Buffer.from(`track:${row.id}
	a pmw:Track ;
	dc:title ${JSON.stringify(row.title)} ;${row.hidden ? "\n\tpmw:hidden 1 ;" : ""}
	dc:date "${dateToString(row.release_date)}" .\n`);
		fs.writeSync(file, buf);
	}

	results = await db.query(`
		SELECT *
		FROM track_tags
		ORDER BY track_id
	`);

	let currentTrack = -1;
	let currentProps = [];

	for(let row of results.rows)
	{
		if(currentTrack != row.track_id)
		{
			if(currentTrack != -1 && currentProps.length)
			{
				buf = new Buffer.from(`track:${currentTrack}\n` + currentProps.join(" ;\n") + " .\n")
				fs.writeSync(file, buf);
			}
			
			currentProps = [];
			currentTrack = row.track_id;
		}
		
		switch(row.property)
		{
			case "hyperlink":
				currentProps.push(`\tpmw:hyperlink <${row.value.replace(/ /g,"%20")}>`);
				break;
			case "reupload hyperlink":
				currentProps.push(`\tpmw:reupload_hyperlink <${row.value.replace(/ /g,"%20")}>`);
				break;
			case "alt mix hyperlink":
				currentProps.push(`\tpmw:alt_mix_hyperlink <${row.value.replace(/ /g,"%20")}>`);
				break;
			case "youtube offset":
				currentProps.push(`\tpmw:youtube_offset <${row.value.replace(/ /g,"%20")}>`);
				break;
			case "artist":
				currentProps.push(`\tpmw:artist artist:${turtleEncode(row.value)}`);
				break;
			case "featured artist":
				currentProps.push(`\tpmw:featured_artist artist:${turtleEncode(row.value)}`);
				break;
			case "cover":
			case "remix":
				currentProps.push(`\tpmw:${row.property} track:${row.value}`);
				break;
			case "tag":
			case "genre":
				currentProps.push(`\tpmw:${row.property} ${JSON.stringify(row.value)}`);
				break;
			case "pl":
				currentProps.push(`\tpmw:pl ${row.value}`);
				break;
			default:
				break;
		}
	}

	if(currentTrack != -1 && currentProps.length)
	{
		buf = new Buffer.from(`track:${currentTrack}\n` + currentProps.join(" ;\n") + " .\n")
		fs.writeSync(file, buf);
	}

	//************** Artists **************

	results = await db.query(`
		SELECT distinct value
		FROM track_tags
		WHERE (property ='artist' or property='featured artist')
		AND value NOT IN (SELECT id FROM tag_metadata WHERE type='artist')`)

	for(let row of results.rows)
	{
		buf = new Buffer.from(`artist:${turtleEncode(row.value)} a pmw:Artist ;\n\tfoaf:name ${JSON.stringify(row.value)} .\n`);
		fs.writeSync(file, buf);
	}


	results = await db.query(`
		SELECT *
		FROM tag_metadata
		WHERE type='artist'
		ORDER BY id
	`);
	let currentArtist = "";
	currentProps = [];

	for(let row of results.rows)
	{
		if(currentArtist != row.id)
		{
			if(currentArtist != "" && currentProps.length)
			{
				buf = new Buffer.from(`artist:${turtleEncode(currentArtist)}\n` + currentProps.join(" ;\n") + " .\n")
				fs.writeSync(file, buf);
			}
			
			currentProps = [];
			currentArtist = row.id;
			currentProps.push("\ta pmw:Artist");
			currentProps.push("\tfoaf:name " + JSON.stringify(row.id));

		}
		
		switch(row.property)
		{
			case "twitter":
			case "youtube":
			case "soundcloud":
			case "ponyfm":
			case "mastodon":
			case "bluesky":
			case "spotify":
			case "bandcamp":
			case "applemusic":
			case "personalsite":
				currentProps.push(`\tpmw:${row.property} <${row.value.replace(/ /g,"%20")}>`);
				break;
			case "group member":
				currentProps.push(`\tpmw:group_member artist:${turtleEncode(row.value)}`);
				break;
			default:
				currentProps.push(`\tpmw:${row.property.replace(/ /g,"_")} ${JSON.stringify(row.value)}`);
		}
	}

	if(currentArtist != "" && currentProps.length)
	{
		buf = new Buffer.from(`artist:${turtleEncode(currentArtist)}\n` + currentProps.join(" ;\n") + " .\n")
		fs.writeSync(file, buf);
	}

	//************** Albums **************


	results = await db.query(`
		SELECT distinct value as album, '' as property, '' as value
		FROM track_tags
		WHERE property='album'
		UNION
		SELECT id, property, value
		FROM tag_metadata
		WHERE type='album'
		ORDER BY album`);

	let currentAlbum = "";
	currentProps = [];

	for(let row of results.rows)
	{
		if(currentAlbum != row.album)
		{
			if(currentAlbum != "" && currentProps.length)
			{
				buf = new Buffer.from(`album:${turtleEncode(currentAlbum)}\n` + currentProps.join(" ;\n") + " .\n")
				fs.writeSync(file, buf);
			}
			
			currentProps = [];
			currentAlbum = row.album;
			currentProps.push("\ta pmw:Album");
			currentProps.push(`\tdc:title ${JSON.stringify(currentAlbum)}`);
			currentProps.push(`\tpmw:tracklist <http://ponymusic.wiki/album/${turtleEncode(currentAlbum)}#tracklist>`);
		}

		switch(row.property)
		{
			case "hyperlink":
				currentProps.push(`\tpmw:hyperlink <${row.value.replace(/ /g,"%20")}>`);
				break;
			case "physical release only":
				currentProps.push(`\tpmw:physical_release_only 1`);
				break;
			default:
				break;
		}
	}

	if(currentAlbum != "" && currentProps.length)
	{
		buf = new Buffer.from(`album:${turtleEncode(currentAlbum)}\n` + currentProps.join(" ;\n") + " .\n")
		fs.writeSync(file, buf);
	}


	results = await db.query(`
		SELECT *
		FROM track_tags
		WHERE property='album'
		ORDER BY value,number
	`);
	currentAlbum = "";
	currentProps = [];

	for(let row of results.rows)
	{
		if(currentAlbum != row.value)
		{
			if(currentAlbum != "" && currentProps.length)
			{
				buf = new Buffer.from(`<http://ponymusic.wiki/album/${turtleEncode(currentAlbum)}#tracklist>\n` + currentProps.join(" ;\n") + " .\n")
				fs.writeSync(file, buf);
			}
			
			currentProps = [];
			currentAlbum = row.value;
			currentProps.push("\ta rdf:Seq");
			
		}

		currentProps.push(`\trdf:_${row.number} track:${row.track_id}`);
	}

	if(currentAlbum != "" && currentProps.length)
	{
		buf = new Buffer.from(`<http://ponymusic.wiki/album/${turtleEncode(currentAlbum)}#tracklist>\n` + currentProps.join(" ;\n") + " .\n")
		fs.writeSync(file, buf);
	}


		

	fs.closeSync(file);

}

function plMap(x)
{
	if(x == 2)
		return "Obvious"
	if(x == 1)
		return "Subtle"
	if(x == 0)
		return "No Refs"
	return "";
}



async function exportTable(stream, table, cols)
{
	let db = new Pool(poolConfig);
	
	stream.write(`DELETE FROM ${table};\n`);
	stream.write("\tINSERT INTO "+table+" (" + Object.keys(cols).join(", ") + ") VALUES\n")
	
	let offset = 0;	

	while(true)
	{
		let partialQuery = "SELECT * FROM " + table + " LIMIT 10000 OFFSET " + offset;
		let response = await db.query(partialQuery); 

		offset += 10000;
		if(response.rows.length == 0)
			break;

		for(let row of response.rows)
		{
			let rowVals = [];

			for (let col in cols)
			{
				try
				{
					switch(cols[col])
					{
						case "string": 
							rowVals.push(sqlEscapeString(row[col]));
							break;
						case "json":
							rowVals.push(escapeJSON(JSON.stringify(row[col])));
							break;
						case "bool":
							rowVals.push(row[col] ? "TRUE" : "FALSE");
							break;
						case "date":
							rowVals.push("'" + row[col].toISOString() + "'");
							break;
						case "number|null": 
						case "number": 
							rowVals.push("" + row[col]);
							break;
					}
				}
				catch(e)
				{
					console.log("TABLE " + table);
					console.log("ROW")
					console.log(row);
					console.log("COLUMN " + col);
					throw e;
				}
			}

			stream.write("\t("+ rowVals.join(",")+")\n");
		}
	}

}


function publicTables(stream)
{
	stream.write(`
	CREATE TABLE IF NOT EXISTS tracks (
		id SERIAL PRIMARY KEY,
		title VARCHAR(255) NOT NULL,
		release_date DATE NOT NULL,
		ogcache VARCHAR(1024) NOT NULL,
		titlecache VARCHAR(511) NOT NULL,
		hidden BOOLEAN NOT NULL
	);

	CREATE TABLE IF NOT EXISTS track_tags(
		track_id INTEGER NOT NULL,
		property VARCHAR(255) NOT NULL,
		value TEXT NOT NULL,
		number INTEGER
	);

	CREATE TABLE IF NOT EXISTS tag_metadata (
		type VARCHAR(255) NOT NULL,
		id TEXT NOT NULL,
		property VARCHAR(255) NOT NULL,
		value TEXT NOT NULL
	);

	CREATE INDEX IF NOT EXISTS property_index ON track_tags(property, value);
	CREATE INDEX IF NOT EXISTS track_id_index ON track_tags(track_id);
	CREATE INDEX IF NOT EXISTS object_index ON tag_metadata(type, id);
	CREATE INDEX IF NOT EXISTS property_index ON tag_metadata(property, value);
	`);
}