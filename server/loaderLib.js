export default {doLoad, doPull, doExport, doExcelExport};

import fs from 'fs';
import ExcelJS from 'exceljs'
import https from "https"
import pg from "pg";
const {Pool, Client} = pg;
import dotenv from "dotenv";
dotenv.config();

async function doLoad(filename)
{
	let tableQueries = fs.readFileSync(filename, {encoding:'utf8'}).split(";\n").map(x => x.replace(/\n/g, " "));

	let db = new Pool();
	
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
	
	textArr.push(await exportTable("users", {id: "string", name: "string", role: "number", avatar: "string"}));
	textArr.push(await exportTable("tracks", {id: "number", title: "string", release_date: "date", locked: "bool", ogcache: "json", titlecache:"string", hidden: "bool"}));
	textArr.push(await exportTable("track_tags", {track_id: "number", property: "string", value:"string", number: "number|null"}));
	textArr.push(await exportTable("track_history", {track_id: "number", user_id: "string", value:"json", timestamp: "date"}));
	textArr.push(await exportTable("user_flags", {track_id: "number", user_id: "string", flag:"string", value:"number"}));
	textArr.push(await exportTable("tag_metadata", {type: "string", id:"string", property:"string", value:"string"}));
	textArr.push(await exportTable("tag_metadata_history", {user_id: "string", timestamp: "date", type:"string", id:"string", value:"json"}));

	textArr.push("SELECT SETVAL(pg_get_serial_sequence('tracks', 'id'), (SELECT (MAX(track_id) + 1) FROM track_history));");
	
	fs.writeFileSync("./fullExport.sql", textArr.join(""));

	// public export
	let publicCopyArr = ["-- This data was exported on " + new Date().toISOString()];
	publicCopyArr.push(publicTables());
	publicCopyArr.push(await exportTable("tracks", {id: "number", title: "string", release_date: "date", ogcache: "json", titlecache:"string", hidden: "bool"}));
	publicCopyArr.push(await exportTable("track_tags", {track_id: "number", property: "string", value:"string", number: "number|null"}));
	publicCopyArr.push(await exportTable("tag_metadata", {type: "string", id:"string", property:"string", value:"string"}));

	fs.writeFileSync("./public/export/export.sql", publicCopyArr.join(""));
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

	let db = new Pool();
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



async function exportTable(table, cols)
{
	let db = new Pool();
	let response = await db.query("SELECT * FROM " + table); 

	let text = `DELETE FROM ${table};\n`;
	let header = "\tINSERT INTO "+table+" (" + Object.keys(cols).join(", ") + ") VALUES\n"
	let values = [];

	for(let row of response.rows)
	{
		//console.log(row);

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

		values.push("\t("+ rowVals.join(",")+")");
	}

	text += header +  values.join(",\n") + ";\n";
	return text;
}


function publicTables()
{
	return `
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
	`;
}