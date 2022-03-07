require('dotenv').config()
const cors = require('cors');
const path = require('path');
const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const {Pool, Client} = require('pg');
const https = require("https")
const http = require("http");
const {AuthorizationCode} = require('simple-oauth2');

const {PERM, auth, reqHasPerm, getSession} = require("./server/auth.js");
const {getOgCache, getOgPropertiesFromURL} = require('./server/helpers.js');



const validProperties = ["album","genre","artist","featured artist","tag","hyperlink","pl"];

const app = express();
const PORT = process.env.PORT || 80;

const PAGE_COUNT = 100;
const MAX_STRING_LENGTH = 256;
const DAILY_RATE_LIMIT = 10;

var httpsConfig = {};


if(process.env.SSL_CERT)
{
	var privateKey  = fs.readFileSync(process.env.SSL_KEY, 'utf8');
	var certificate = fs.readFileSync(process.env.SSL_CERT, 'utf8');
	httpsConfig = {key: privateKey, cert: certificate};
}

app.use(cors());

// Delay settings
const DELAY = 1500; 
//app.use(addDelay);

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

app.get("/login", async (req,res) =>
{
	const client = new AuthorizationCode({

		client: {
			id: process.env.DISCORD_APP_ID,
			secret: process.env.DISCORD_APP_SECRET
		},
		auth: {
			tokenHost: 'https://discord.com/api/',
			tokenPath: 'oauth2/token',
			authorizePath: 'oauth2/authorize'
		}
	});

	/*const authorizationUri = client.authorizeURL({
		redirect_uri: 'https://ponymusic.wiki/login',
		scope: '<scope>'
	});*/

	// Redirect example using Express (see http://expressjs.com/api.html#res.redirect)
	//res.redirect(authorizationUri);

	console.log(req.query);

	const tokenParams = {
		code: req.query.code,
		redirect_uri: 'https://ponymusic.wiki/login',
		scope: 'identify', // see discord documentation https://discord.com/developers/docs/topics/oauth2#oauth2
	};

	let accessToken = {};

	try {
		accessToken = await client.getToken(tokenParams);
	}
	catch (error)
	{	
		//console.log('Access Token Error', error.message);
		res.redirect("/");
		return;
	}

	console.log(accessToken);

	let options = {
		headers:{
			"Authorization": accessToken.token.token_type + " " + accessToken.token.access_token
		}
	}

	https.get("https://discord.com/api/users/@me", options, function(response)
	{
		let rawData = "";
		response.setEncoding('utf8');
		response.on("data", (chunk) => {rawData += chunk});

		response.on('end', function()
		{
			console.log("https call complete");
			console.log(rgit aawData);
			res.redirect("/?session=1");
		})
	});
});

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

	var pattern = "%" + sqlEscapeStringNoQuotes(req.body.value).toLowerCase() + "%";

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
	let page = Number(req.query.page) || 0; 
	let offset = page*PAGE_COUNT;

	let tagFilter = '(tag "artist" "vylet pony")';
	let order = "(desc release_date)";

	let whereClause = "";
	let whereClauses = [];


	let simpleFilters = ["artist","featured_artist","album","genre","pl","tag"]
	
	for(let key of simpleFilters)
	{
		let negKey = "x_" + key;
		let prop = key;

		if(key=="featured_artist"){
			prop = "featured artist";
		}

		if(req.query[key]){
			whereClauses.push(buildWhereClause(prop, req.query[key], false))
		}
		else if(req.query[negKey]){
			whereClauses.push(buildWhereClause(prop, req.query[negKey], true))
		}
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
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='featured artist') as featured_artist, 
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='hyperlink') as hyperlink,
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='genre') as genre,
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='album') as album,
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='tag') as tag,
			(SELECT COALESCE(value, '') from track_tags WHERE track_id=id and property='pl') as pl
		FROM tracks 
		${whereClause}
		ORDER BY release_date DESC
		LIMIT ${PAGE_COUNT} OFFSET ${offset}`;

	let {rows} = await db.query(query,[]);
	let countRequest = await db.query(`SELECT COUNT(*) as count FROM tracks ${whereClause}`,[]);

	res.json({rows, pages: Math.ceil(countRequest.rows[0].count/PAGE_COUNT)});
});


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

	let response = trackRows[0];

	if(!response)
	{
		res.json({status: 200, deleted:true});
		return;
	}

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


app.post("/api/track", processJSON, auth(PERM.UPDATE_TRACK), async (req,res) =>
{
	var data = req.body;
	let userID = (await getSession(req)).user_id;

	let title = (data.title || "").trim();
	let release_date = data.release_date.trim();


	if(isNaN(new Date(release_date).getTime()))
	{
		res.json({status:400, error: "Invalid date"});
		return;
	}

	if(title.length == 0 || title.length > MAX_STRING_LENGTH)
	{
		res.json({status:400, error: "Invalid title"});
		return;
	}

	if(!reqHasPerm(req, PERM.UNLIMITED_EDITS))
	{
		let {rows} = await db.query("SELECT COUNT(*) as count from track_history WHERE user_id=$1 AND timestamp > (NOW() - interval '1 day')", [userID]);
		if(rows[0].count >= DAILY_RATE_LIMIT)
		{
			res.json({status:400, error: "You have reached the daily limit for edits you can perform. If you would like for the rate limit to be removed, contact a moderator"});
			return;
		}
	}

	let id = data.id;

	let ogcache = {};

	try
	{
		ogcache = await getOgCache(data) || {};
	}
	catch(e){};

	var info = {};
	let deleted = false;


	// validate tags 

	if(id == "new")
	{
		let x = await db.query("INSERT INTO tracks (title, release_date, locked, ogcache) VALUES ($1, $2, false, $3) RETURNING id", [title, release_date, ogcache]);

		if(x.err)
		{
			res.json({status:400, error: "Error code 1"});
			return;
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

		let {rows} = await db.query("SELECT * FROM tracks WHERE id=$1", [id]);
		if(rows.length)
		{
			info = await db.query("UPDATE tracks SET title=$1, release_date=$2, ogcache=$3 WHERE id=$4", [title, release_date, ogcache, id]);	
			if(info.err)
			{ 
				res.json({status:400, error: "Error code 2"});
				return;
			}	
		}
		else
		{
			// restoring a deleted track
			await db.query("INSERT INTO tracks (id, title, release_date, locked, ogcache) VALUES ($1, $2, $3, false, $4)", [id, title, release_date, ogcache]);
		}
	}

	for(tag of data.tags)
	{
		let value = tag.value.trim();

		if (!tag.property || !tag.value || value.length == 0 || value.length > MAX_STRING_LENGTH || validProperties.indexOf(tag.property) == -1){
			res.json({status:400, error: "Invalid tag " + JSON.stringinfy(tag) });
			return;
		}
	}

	await db.query("DELETE FROM track_tags WHERE track_id=$1", [id]);

	

	for(tag of data.tags)
	{
		if(!isNaN(tag.number))
		{
			info = await db.query("INSERT INTO track_tags (track_id, property, value, number) VALUES ($1, $2, $3, $4)", [id, tag.property, tag.value, tag.number]);
			if(info.err){ 
				res.json({status:400, error: "Error code 3"});
				return;
			}	
		}
		else
		{
			info = await db.query("INSERT INTO track_tags (track_id, property, value) VALUES ($1, $2, $3)", [id, tag.property, tag.value,]);
			if(info.err){ 
				res.json({status:400, error: "Error code 4"});
				return;
			}	
		}
	}

	
	info = await db.query("INSERT INTO track_history (track_id, user_id, timestamp, value) VALUES ($1, $2, NOW(), $3)", [id, userID, {title, release_date, tags: data.tags}]);

	if (info.err) {
		res.json({status:400, error: "error 5"});
		return;
	}

	res.json({status: 200, id});
	
});



app.delete("/api/track", processJSON, auth(PERM.DELETE_TRACK), async (req,res) =>
{
	var data = req.body;
	let userID = (await getSession(req)).user_id;

	let id = Number(data.id)

	if(isNaN(id)){
		res.json({status: 400});
	}

	console.log("DELETEING " + id);

	await db.query("DELETE FROM tracks WHERE id=$1", [id]);	
	await db.query("DELETE FROM track_tags WHERE track_id=$1", [id]);
	await db.query("INSERT INTO track_history (track_id, user_id, timestamp, value) VALUES ($1, $2, NOW(), $3)", [id, userID, {deleted:true}]);

	res.json({status: 200, id});
});


app.post("/api/findDuplicates", processJSON, async (req,res) =>
{
	var data = req.body;

	let title = (data.title || "").trim();

	let duplicates = [];

	if(data.id == "new"){
		data.id = -1;
	}


	let info = await db.query("SELECT id FROM tracks WHERE LOWER(title)=LOWER($2) AND id !=$1", [data.id, title]);

	if(info.rows.length)
	{
		duplicates.push({value: title, duplicates: info.rows.map(x => x.id)});
	}

	// hyperlink tag

	for(tag of data.tags)
	{
		let value = tag.value.trim();

		if (!tag.property || !tag.value || value.length == 0 || value.length > MAX_STRING_LENGTH || validProperties.indexOf(tag.property) == -1){
			res.json({status:400, error: "Invalid tag " + JSON.stringinfy(tag) });
			return;
		}
	}

	for(tag of data.tags)
	{
		info = await db.query("SELECT track_id FROM track_tags WHERE property='hyperlink' AND value=$1 AND track_id !=$2", [tag.value, data.id]);

		if(info.rows.length)
		{
			duplicates.push({value: tag.value, duplicates: info.rows.map(x => x.track_id)});
		}
	}

	res.json({status: 200, duplicates});
	
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


function addDelay(req, res, next)
{
	if(DELAY)
	{
		setTimeout(next, DELAY);
	}
	else
	{
		next();
	}
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


if(process.env.SSL_CERT)
{
	var httpsServer = https.createServer(httpsConfig, app);
	httpsServer.listen(PORT);
	console.log("Running Ponymusic.wiki on SECURE port " + PORT)
}
else
{
	var httpServer = http.createServer(app);
	httpServer.listen(PORT);
	console.log("Running Ponymusic.wiki on port " + PORT)
}


