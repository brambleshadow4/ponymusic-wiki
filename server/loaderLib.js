export default {doLoad, doPull, doExport};

import fs from 'fs';
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

	s = s.replace(/\\/g, "\\\\");
	s = s.replace(/'/g, "''");
	s = s.replace(/%/g,"\\%");
	s = s.replace(/\n/g,"\\n");

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
	textArr.push("SELECT SETVAL(pg_get_serial_sequence('tracks', 'id'), (SELECT (MAX(track_id) + 1) FROM track_history));");
	
	fs.writeFileSync("./fullExport.sql", textArr.join(""));

	// public export
	let publicCopyArr = ["-- This data was exported on " + new Date().toISOString()];
	publicCopyArr.push(publicTables());
	publicCopyArr.push(await exportTable("tracks", {id: "number", title: "string", release_date: "date", ogcache: "json", titlecache:"string"}));
	publicCopyArr.push(await exportTable("track_tags", {track_id: "number", property: "string", value:"string", number: "number|null"}));

	fs.writeFileSync("./public/export/export.sql", publicCopyArr.join(""));
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
		titlecache VARCHAR(511) NOT NULL
	);

	CREATE TABLE IF NOT EXISTS track_tags(
		track_id INTEGER NOT NULL,
		property VARCHAR(255) NOT NULL,
		value TEXT NOT NULL,
		number INTEGER
	);

	CREATE INDEX IF NOT EXISTS property_index ON track_tags(property, value);`;
}