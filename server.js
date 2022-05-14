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
const { v4: uuidv4 } = require('uuid');

const {PERM, ROLE, auth, reqHasPerm, getSession} = require("./server/auth.js");
const {getOgCache, getOgPropertiesFromURL} = require('./server/helpers.js');


const validProperties = ["album","genre","artist","featured artist","tag","hyperlink","pl","cover","remix","original artist"];

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

	//console.log(req.query);

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

		response.on('end', async function()
		{
			//console.log("https call complete");
			let data = {};
			try{
				data = JSON.parse(rawData);
			}
			catch(e){
				return;
			}


			let role = ROLE.USER;

			let userID = "d:" + data.id;
			let avatar = `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
			let {rows} = await db.query("SELECT * FROM users WHERE id = $1", [userID]);
		
			if(!rows.length)
			{
				await db.query("INSERT INTO users (id, name, avatar, role) VALUES ($1, $2, $3, $4)", [userID, data.username, avatar, role]);
			}
			else
			{
				role = rows[0].role;
				await db.query("UPDATE users SET name=$2, avatar=$3 WHERE id=$1", [userID, data.username, avatar]);
			}

			//await db.query("DELETE FROM sessions WHERE user_id=$1", [userID]);
			let session = uuidv4();

			await db.query("INSERT INTO sessions (session, user_id, expire_time) VALUES ($1, $2, NOW() + interval '1 month')", [session, userID]);

			res.redirect("/?session=" + session + "," + role + "," + avatar);
		})
	});
});

app.post("/restoreSession", processJSON, async (req,res) =>
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
	else if(property == "cover" || property == "remix")
	{
		var words = req.body.value.toLowerCase().split(/\s/g).filter(x => x)
			.map(x => "LOWER(titlecache) LIKE '%" + sqlEscapeStringNoQuotes(x) + "%'");
		let queryText = words.join(" AND ");

		var {rows} = await db.query("SELECT id, titlecache FROM tracks WHERE " + queryText);

		let strippedRows = rows.map(x => {return {text: x.titlecache, value: "" + x.id, property}});

		res.json(strippedRows);

		return; 
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
	let ses = await getSession(req);
	let userID = ses && ses.user_id;

	let whereClause = await buildWhereClause(req, new Set(["artist","featured_artist","album","genre","pl","tag","release_date","status","title"]));

	let albumNoSelect = "";

	let orderBy = "ORDER BY release_date DESC";

	//console.log(req.query.sort);
	

	if(req.query.album && req.query.album.length == 1)
	{
		albumNoSelect = `(SELECT number from track_tags WHERE track_id=id AND property='album' AND value=${sqlEscapeString(req.query.album[0])} LIMIT 1) as album_no,`;

		if(req.query.sort && req.query.sort[0] == "^album_no")
		{
			orderBy = "ORDER BY album_no ASC";
		}
	}

	let query = `
		SELECT id, title, release_date,
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='artist') as artist,
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='featured artist') as featured_artist, 
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='hyperlink') as hyperlink,
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='genre') as genre,
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='album') as album,
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='tag') as tag,
			(SELECT COALESCE(value, '') from track_tags WHERE track_id=id and property='pl') as pl,
			${albumNoSelect}
			(SELECT value FROM user_flags WHERE track_id=id AND user_id=$1 AND flag='status') as status
		FROM tracks 
		${whereClause}
		${orderBy}
		LIMIT ${PAGE_COUNT} OFFSET ${offset}`;

	let {rows} = await db.query(query,[userID]);
	let countRequest = await db.query(`SELECT COUNT(*) as count FROM tracks ${whereClause}`,[]);

	res.json({rows, pages: Math.ceil(countRequest.rows[0].count/PAGE_COUNT)});
});

/*app.get("/api/album/*", queryProcessing, async(req,res) =>{

	let albumName = req.params[0];
	req.query.album = albumName;

	let whereClause = await buildWhereClause(req, new Set(["artist","featured_artist","album","genre","pl","tag","status"]))
	let query = `
		SELECT id, title, release_date,
			(SELECT number from track_tags WHERE track_id=id and property='album') as no,
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='artist') as artist,
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='featured artist') as featured_artist, 
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='hyperlink') as hyperlink,
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='genre') as genre,
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='tag') as tag,
			(SELECT COALESCE(value, '') from track_tags WHERE track_id=id and property='pl') as pl,
			(SELECT value FROM user_flags WHERE track_id=id AND user_id=$1 AND flag='status') as status
		FROM tracks 
		${whereClause}
		ORDER BY no ASC`;

	let {rows} = await db.query(query);

	res.json(rows);
})*/

app.get("/api/history/track/*", async(req,res) =>
{
	let id = req.params[0];

	let {rows} = await db.query(
		`SELECT track_history.*, users.name FROM track_history LEFT JOIN users ON user_id = id WHERE track_id=$1 ORDER BY timestamp DESC LIMIT ${PAGE_COUNT}`
	, [id]);

	for(let row of rows)
	{
		for(let tag of row.value.tags)
		{
			if(tag.property == "remix" || tag.property == "cover")
			{
				let remixRows = (await db.query("SELECT titlecache FROM tracks WHERE id=$1", [tag.value])).rows;
				tag.text = remixRows.length ? remixRows[0].titlecache : "Deleted track";
			}
			else
			{
				tag.text = tag.value;
			}
		}
	}

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

	let countRequest = await db.query(`SELECT COUNT(*) as count FROM track_history`,[]);


	if(!rows){
		res.json({status: 400});
		return;
	}

	res.json({rows, pages: Math.ceil(countRequest.rows[0].count/PAGE_COUNT), status:200});
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
		let newTag = {property: tag.property, value: tag.value};

		if(!isNaN(tag.number))
		{
			newTag.number = tag.number;
		}


		if(tag.property == "cover" || tag.property == "remix")
		{
			let remixRows = (await db.query("SELECT titlecache FROM tracks WHERE id=$1", [tag.value])).rows;
			newTag.text = remixRows.length ? remixRows[0].titlecache : "Deleted track";
		}
		else
		{
			newTag.text = tag.value;
		}
		

		response.tags.push(newTag);
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

	let title = trim2(data.title || "")
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

	let titleCache = "";

	let titleCacheArtists = [];

	// validate tags

	data.tags = data.tags.filter(x => x && x.property && x.value && !(x.property == "original artist"));

	for(tag of data.tags)
	{	
		let value = tag.value;

		if (!tag.property || !tag.value || value.length == 0 || value.length > MAX_STRING_LENGTH || validProperties.indexOf(tag.property) == -1){
			res.json({status:400, error: "Invalid tag " + JSON.stringify(tag) });
			return;
		}

		

		if(tag.property == "artist")
		{
			titleCacheArtists.push(tag.value);
		}

		tag.value = trim2(tag.value);

		// Use whatever existing casing is in the database for the tag value.
		if(tag.property != "hyperlink")
		{
			let goodTag = await db.query("SELECT value FROM track_tags WHERE property=$1 and value=LOWER($2)", [tag.property, tag.value]);
			if(goodTag.rows.length){
				tag.value = goodTag.rows[0].value;
			}
		}
	}

	titleCache = (title + ' - ' + titleCacheArtists.join(", ")).substring(0,512);

	// insert the track

	if(id == "new")
	{
		let x = await db.query("INSERT INTO tracks (title, release_date, locked, ogcache, titlecache) VALUES ($1, $2, false, $3, $4) RETURNING id", [title, release_date, ogcache, titleCache]);

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
			info = await db.query("UPDATE tracks SET title=$1, release_date=$2, ogcache=$3, titlecache=$5 WHERE id=$4", [title, release_date, ogcache, id, titleCache]);	
			if(info.err)
			{ 
				res.json({status:400, error: "Error code 2"});
				return;
			}	
		}
		else
		{
			// restoring a deleted track
			await db.query("INSERT INTO tracks (id, title, release_date, locked, ogcache, titlecache) VALUES ($1, $2, $3, false, $4, $5)", [id, title, release_date, ogcache, titleCache]);
		}
	}	

	// update tags

	await db.query("DELETE FROM track_tags WHERE track_id=$1", [id]);

	let originalArtists = new Set();

	for(let tag of data.tags)
	{
		if(typeof tag.number == "number")
		{

			info = await db.query("INSERT INTO track_tags (track_id, property, value, number) VALUES ($1, $2, $3, $4)", [id, tag.property, tag.value, tag.number]);
			if(info.err){ 
				res.json({status:400, error: "Error code 3"});
				return;
			}	
		}
		else
		{
			info = await db.query("INSERT INTO track_tags (track_id, property, value) VALUES ($1, $2, $3)", [id, tag.property, tag.value]);


			if(info.err){ 
				res.json({status:400, error: "Error code 4"});
				return;
			}	

			if(tag.property == "cover" || tag.property == "remix")
			{
				let originalArtistRows = (await db.query("SELECT value FROM track_tags WHERE track_id=$1 AND property='artist'", [tag.value])).rows

				if(originalArtistRows && originalArtistRows.length)
				{
					for(let row of originalArtistRows)
					{
						if(!originalArtists.has(row.value))
						{
							originalArtists.add(row.value);

							info = await db.query("INSERT INTO track_tags (track_id, property, value) VALUES ($1, 'original artist', $2)", [id, row.value]);

							if(info.err){ 
								res.json({status:400, error: "Error 6"});
								return;
							}	
						}
					}
				}
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

	let info = await db.query("SELECT id, titlecache FROM tracks WHERE LOWER(title)=LOWER($2) AND id !=$1", [data.id, title]);

	for(row of info.rows)
	{
		duplicates.push({value: title, id: row.id, name: row.titlecache});
	}

	// hyperlink tag

	for(tag of data.tags)
	{
		if (!tag.value || typeof(tag.value) != "string") {
			res.json({status:400, error: "Invalid tag " + JSON.stringify(tag) });
			return;
		}

		value = tag.value.trim();

		if (!tag.property || value.length == 0 || value.length > MAX_STRING_LENGTH || validProperties.indexOf(tag.property) == -1){
			res.json({status:400, error: "Invalid tag " + JSON.stringify(tag) });
			return;
		}
	}

	for(tag of data.tags)
	{
		info = await db.query("SELECT a.track_id as id, b.titlecache as name FROM track_tags as a LEFT JOIN tracks as b ON a.track_id=b.id WHERE property='hyperlink' AND value=$1 AND track_id !=$2", [tag.value, data.id]);

		for(row of info.rows)
		{
			duplicates.push({value: tag.value, id: row.id, name: row.name});
		}
	}

	res.json({status: 200, duplicates});
	
});

app.put("/api/setUserFlag", processJSON, auth(PERM.USER_FLAGS), async (req, res) =>
{
	let userID = (await getSession(req)).user_id;
	let ALLOWED_FLAGS = new Set(["status","fav","rating"]);
	let data = req.body || {};
	
	if(!ALLOWED_FLAGS.has(data.flag))
	{
		res.json({status: 400, error:"Bad Flag type"});
		return;
	}

	await db.query("DELETE FROM user_flags WHERE track_id=$1 AND user_id=$2 AND flag=$3", [data.track_id, userID, data.flag]);

	if(data.value){
		await db.query("INSERT INTO user_flags (track_id, user_id, flag, value) VALUES ($1, $2, $3, $4) ", [data.track_id, userID, data.flag, data.value]);
	}

	res.json({status: 200});

} )


async function buildWhereClause(req, allowedFilters)
{
	let userID ="";

	if(req.query.session)
	{
		userID = (await getSession(req)).user_id;
	}

	let session = req.query.session;

	let whereClause = "";
	let whereClauses = [];

	let simpleFilters = ["artist","featured_artist","album","genre","pl","tag"];
	
	for(let key of simpleFilters)
	{
		let negKey = "x_" + key;
		let prop = key;

		if(key=="featured_artist")
		{
			prop = "featured artist";
		}

		if(!allowedFilters.has(key))
		{
			continue;
		}

		if(req.query[key])
		{
			whereClauses.push(buildWhereClausePart(prop, req.query[key], false))
		}
		else if(req.query[negKey])
		{
			whereClauses.push(buildWhereClausePart(prop, req.query[negKey], true))
		}
	}


	if(allowedFilters.has("release_date"))
	{
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
	}

	if(allowedFilters.has("title"))
	{
		if(req.query.title)
		{
			let words = req.query.title
				.filter(x => x)
				.map(s => ("%" + sqlEscapeStringNoQuotes(s) + "%").toLowerCase())
				.join("|");
			whereClauses.push(`LOWER(title) SIMILAR TO '${words}'`);
		}
	}

	if(allowedFilters.has("status"))
	{
		if(req.query.status && userID)
		{
			whereClauses.push(buildStatusClause(userID, req.query.status, false))
		}
		else if(req.query.x_status && userID)
		{
			whereClauses.push(buildStatusClause(userID, req.query.x_status, true))
		}
	}
	


	if(whereClauses.length)
	{
		return "WHERE " + whereClauses.join(" AND ") + " ";
	}
	else{
		return "";
	}
}

function buildWhereClausePart(property, valueList, negate)
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

function buildStatusClause(userID, valueList, negate)
{
	let valueListNoNulls = valueList.filter(x => x != "").map(x => Number(x) + "").join(",");
	let hasBlank = valueList.filter(x => x=="").length > 0;

	let flag = "status";

	let clauses = [];

	if(negate)
	{
		if(valueListNoNulls.length)
		{
			clauses.push(`id NOT IN (SELECT track_id FROM user_flags WHERE user_id='${userID}' AND value IN (${valueListNoNulls}) AND flag='${flag}')`)
		}

		if(hasBlank)
		{
			// if excluding blanks, have to have the proeprty
			clauses.push(`id IN (SELECT track_id FROM user_flags WHERE user_id='${userID}' AND flag='${flag}')`)
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
			clauses.push(`id IN (SELECT track_id FROM user_flags WHERE user_id='${userID}' AND value IN (${valueListNoNulls}) AND flag='${flag}')`)
		}

		if(hasBlank)
		{
			// if including blanks, get tracks without the flag
			clauses.push(`id NOT IN (SELECT track_id FROM user_flags WHERE user_id='${userID}' AND flag='${flag}')`)
		}

		if(clauses.length == 2)
		{
			return `((${clauses[0]}) OR (${clauses[1]}))`
		}

		return clauses[0];
	}
}


function trim2(s)
{
	return s.trim().replace(/\u200B/g,"");
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


