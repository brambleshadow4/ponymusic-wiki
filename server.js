require('dotenv').config()
const cors = require('cors');
const path = require('path');
const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const {Pool, Client} = require('pg');

const {PERM, auth, reqHasPerm, getSession} = require("./server/auth.js");
const {getOgCache, getOgPropertiesFromURL} = require('./server/helpers.js');

const app = express();
const port = process.env.PORT || 80;

const PAGE_COUNT = 100;

app.use(cors());

// getOgPropertiesFromURL("https://www.youtube.com/watch?v=CNPdO5TZ1DQ", {logProperties:true});

db = new Pool();


let tableQueries = fs.readFileSync("./server/tables.sql", {encoding:'utf8'})
	.split(";");

for (query of tableQueries)
{
	db.query(query, (err, res) =>
	{
		if(err)
		{
			console.error(query);
			throw new Error(err);
		}
	});
}

app.use(express.static('public'));

app.post("/api/login", processJSON, async (req,res) =>
{

	let session = await getSession(req);

	if(session)
	{
		session.status = 200;
		res.json(session);
		return;
	}

	res.json({status: 400})

})


app.post("/api/tagAutofill", processJSON, async (req,res) =>
{
	let property = req.body.property;

	if(property == "" || req.body.value == undefined)
	{
		res.json([]);
		return;
	}

	var pattern = "%" + req.body.value.replace(/%/,"\\%").toLowerCase() + "%";

	if(property == "artist" || property == "featured artist") {
		var {rows, err} = await db.query("SELECT DISTINCT value FROM track_tags WHERE (property = 'artist' OR property = 'featured artist') and LOWER(value) LIKE $1 ORDER BY value ASC", [pattern]);
		
	}
	else {
		var {rows} = await db.query("SELECT DISTINCT value FROM track_tags WHERE property = $1 and LOWER(value) LIKE $2 ORDER BY value ASC", [property, pattern]);
	}

	let strippedRows = rows.map(x => {return {text: x.value, value: x.value, property}});

	res.json(strippedRows);
})

app.get("/api/view/tracks", queryProcessing, async(req,res) =>
{
	console.log(req.query);
	let page = Number(req.query.page) || 0; 
	let offset = page*PAGE_COUNT;

	let tagFilter = '(tag "artist" "vylet pony")';
	let order = "(desc release_date)";


	let whereClause = "";
	let whereClauses = [];


	if(req.query.artist){
		whereClauses.push(buildWhereClause("artist", req.query.artist, false))
	}
	else if(req.query.x_artist){
		whereClauses.push(buildWhereClause("artist", req.query.x_artist, true))
	}

	if(req.query.album){
		whereClauses.push(buildWhereClause("album", req.query.album, false))
	}
	else if(req.query.x_album){
		whereClauses.push(buildWhereClause("album", req.query.x_album, true))
	}

	if(req.query.genre){
		whereClauses.push(buildWhereClause("genre", req.query.genre, false))
	}
	else if(req.query.x_genre){
		whereClauses.push(buildWhereClause("genre", req.query.x_genre, true))
	}

	if(req.query.pl){
		whereClauses.push(buildWhereClause("pl", req.query.pl, false))
	}
	else if(req.query.x_pl){
		whereClauses.push(buildWhereClause("pl", req.query.x_pl, true))
	}

	if(req.query.release_date)
	{
		let months = req.query.release_date.filter(x => x).map(sqlEscapeString).join(",");
		whereClauses.push(`TO_CHAR(release_date, 'YYYY-MM') IN (${months}) `)
	}
	else if(req.query.x_release_date)
	{
		let months = req.query.x_release_date.filter(x => x).map(sqlEscapeString).join(",");
		whereClauses.push(`TO_CHAR(release_date, 'YYYY-MM') NOT IN (${months}) `)
	}

	if(req.query.title){
		let words = req.query.title
			.filter(x => x)
			.map(s => ("%" + sqlEscapeStringNoQuotes(s) + "%").toLowerCase())
			.join("|");
		whereClauses.push(`LOWER(title) SIMILAR TO '${words}'`);
	}

	if(whereClauses.length)
	{
		whereClause = "WHERE " + whereClauses.join(" AND ") + " ";
	}


	let query = `
		SELECT id, title, release_date,
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='artist') as artist, 
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='hyperlink') as hyperlink,
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='genre') as genre,
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='album') as album,
			(SELECT COALESCE(value, '') from track_tags WHERE track_id=id and property='pl') as pl
		FROM tracks 
		${whereClause}
		ORDER BY release_date DESC
		LIMIT ${PAGE_COUNT} OFFSET ${offset}`;

	let {rows} = await db.query(query,[]);
	let countRequest = await db.query(`SELECT COUNT(*) as count FROM tracks ${whereClause}`,[]);

	res.json({rows, pages: Math.ceil(countRequest.rows[0].count/PAGE_COUNT)});
});


// 
app.get("/api/history/track/*", async(req,res) =>
{
	let id = req.params[0];

	let {rows} = await db.query(
		`SELECT track_history.*, users.name FROM track_history LEFT JOIN users ON user_id = id WHERE track_id=$1 ORDER BY timestamp DESC LIMIT ${PAGE_COUNT}`
	, [id]);

	let response = rows || {status: 400};
	res.json(response);

});

app.get('/api/history', async(req,res) =>
{
	let page = Number(req.query.page) || 0; 
	let offset = page*PAGE_COUNT;

	let {rows} = await db.query(
		`SELECT track_history.timestamp, track_history.track_id, track_history.user_id, users.name as user_name, tracks.title as track_title
		FROM track_history LEFT JOIN users ON user_id = users.id LEFT JOIN tracks on track_id = tracks.id 
		ORDER BY timestamp DESC
		LIMIT ${PAGE_COUNT} OFFSET ${offset}`
	, []);

	let response = rows || {status: 400};
	res.json(response);
})


app.get("/api/track/*", async(req,res) =>
{
	let id = req.params[0];

	if(isNaN(id))
	{
		res.json({status: 400});
		return;
	}

	let trackRows = (await db.query("SELECT * FROM tracks WHERE id=$1", [id])).rows;
	let tagRows = (await db.query("SELECT * FROM track_tags WHERE track_id=$1", [id])).rows;

	let response = trackRows[0] || {status: 400};
	response.tags = [];

	for(tag of tagRows)
	{
		if(!isNaN(tag.number)) {
			response.tags.push({property: tag.property, value: tag.value, number: tag.number});
		}
		else {
			response.tags.push({property: tag.property, value: tag.value});
		}
	}

	if(!response.status){
		response.status = 200;
	}

	res.json(response);
});


app.post("/api/track", processJSON,
	auth(PERM.UPDATE_TRACK), async (req,res) =>
{
	var data = req.body;

	let title = (data.title || "").trim();
	let release_date = data.release_date.trim();


	if(isNaN(new Date(release_date).getTime()))
	{
		res.json({status:400});
		return;
	}

	if(title.length == 0){
		return;
	}

	let id = data.id;
	let ogcache = await getOgCache(data) || {};
	var info = {};

	// validate tags 

	if(id == "new")
	{
		let x = await db.query("INSERT INTO tracks (title, release_date, locked, ogcache) VALUES ($1, $2, false, $3) RETURNING id", [title, release_date, ogcache]);

		if(x.err)
		{
			res.json({status:400});
		}
		else
		{
			id = x.rows[0].id;
		}
	}
	else 
	{
		id = Number(data.id)

		if(isNaN(id)){
			res.json({status: 400});
		}

		info = await db.query("UPDATE tracks SET title=$1, release_date=$2, ogcache=$3 WHERE id=$4", [title, release_date, ogcache, id]);	
		if(info.err){ 
			console.log("2 " + info.err); 
		}	
	}

	await db.query("DELETE FROM track_tags WHERE track_id=$1", [id]);

	for(tag of data.tags)
	{
		if (!tag.property || !tag.value){
			continue;
		}

		if(!isNaN(tag.number))
		{
			info = await db.query("INSERT INTO track_tags (track_id, property, value, number) VALUES ($1, $2, $3, $4)", [id, tag.property, tag.value, tag.number]);
			if(info.err){ 
				console.log("3 " + info.err); 
			}	
		}
		else
		{
			info = await db.query("INSERT INTO track_tags (track_id, property, value) VALUES ($1, $2, $3)", [id, tag.property, tag.value,]);
			if(info.err){ 
				console.log("4 " + info.err); 
			}	
		}
	}

	let userID = (await getSession(req)).user_id;
	info = await db.query("INSERT INTO track_history (track_id, user_id, timestamp, value) VALUES ($1, $2, NOW(), $3)", [id, userID, {title, release_date, tags: data.tags}]);

	if (info.err) {
		console.log("5 " + info.err); 
	}

	res.json({status: 200, id});
});

function buildWhereClause(property, valueList, negate)
{
	let valueListNoNulls = valueList.filter(x => x).map(sqlEscapeString).join(",");
	let hasBlank = valueList.filter(x => !x).length > 0;

	let clauses = [];

	if(negate)
	{
		if(valueListNoNulls.length)
		{
			clauses.push(`id NOT IN (SELECT track_id FROM track_tags WHERE value IN (${valueListNoNulls}) AND property='${property}')`)
		}

		if(hasBlank)
		{
			// if excluding blanks, have to have the proeprty
			clauses.push(`id IN (SELECT track_id FROM track_tags WHERE property='${property}')`)
		}

		if(clauses.length == 2)
		{
			return `((${clauses[0]}) AND (${clauses[1]}))`
		}

		return clauses[0];

	}
	else
	{
		if(valueListNoNulls.length)
		{
			clauses.push(`id IN (SELECT track_id FROM track_tags WHERE value IN (${valueListNoNulls}) AND property='${property}')`)
		}

		if(hasBlank)
		{
			// if including blanks, get tracks without the property
			clauses.push(`id NOT IN (SELECT track_id FROM track_tags WHERE property='${property}')`)
		}

		if(clauses.length == 2)
		{
			return `((${clauses[0]}) OR (${clauses[1]}))`
		}

		return clauses[0];
	}
}

function sqlEscapeString(s)
{
	s = s.replace(/\\/g, "\\\\");
	s = s.replace(/'/g, "''");
	s = s.replace(/%/g,"\\%")
	s = s.replace(/\|/g, "\\|");

	return "'" + s + "'";
}

function sqlEscapeStringNoQuotes(s)
{
	s = s.replace(/\\/g, "\\\\");
	s = s.replace(/'/g, "''");
	s = s.replace(/%/g,"\\%")
	s = s.replace(/\|/g, "\\|");
	return s;
}

function processJSON(req, res, next)
{
	let doTheThing = bodyParser.text({type: "text/json"});

	doTheThing(req, res, function()
	{
		try{
			req.body = JSON.parse(req.body);
		}
		catch(e)
		{
			res.json({status: 400});
			return;
		}

		next();
	});
}

function queryProcessing(req, res, next)
{
	for(key in req.query)
	{
		let s = req.query[key].replace(/,,/g, "\uE000");
		s = s.split(",");
		s = s.map(x => x.replace(/\uE000/g, ","));
		req.query[key] = s;
	}

	next();
}

app.get('*', (req, res) => 
{
	res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

app.listen(port, () => 
{
	console.log(`Server is up at port ${port}`);
});
