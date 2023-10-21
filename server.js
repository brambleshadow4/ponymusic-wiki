import dotenv from "dotenv";
dotenv.config();

import cors from 'cors';
import path from 'path';
import express from 'express';
import fs from 'fs';
import bodyParser from 'body-parser';
import pg from "pg";
const {Pool} = pg;
import https from "https";
import http from "http";
import {AuthorizationCode} from 'simple-oauth2';
import { v4 as uuidv4 } from 'uuid';
import loader from "./server/loaderLib.js";

import {PERM, ROLE, auth, reqHasPerm, getSession} from "./server/auth.js";
import {getOgCache, getOgPropertiesFromURL, areTitlesIdentical} from './server/helpers.js';


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

let db = new Pool();


let tableQueries = fs.readFileSync("./server/tables.sql", {encoding:'utf8'})
	.split(";");

function runQueries()
{
	let query = tableQueries.shift();

	if(!query)
		return;

	db.query(query, (err, res) =>
	{
		if(err)
		{
			throw new Error(err);
		}

		runQueries();
	});

}	

runQueries();


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
});

app.get("/api/search", queryProcessing, async (req,res) =>
{
	let search = req.query.search[0];

	if(!search || !search.trim())
	{
		res.json([]);
		return;
	}

	var weakPattern = "%" + sqlEscapeStringNoQuotes(search).toLowerCase() + "%";
	var strongPattern = sqlEscapeStringNoQuotes(search).toLowerCase() + "%";

	
	let queries = [
		db.query("SELECT DISTINCT property,value FROM track_tags WHERE LOWER(value) LIKE $1 AND property NOT IN ('featured artist', 'original artist','hyperlink') ORDER BY value ASC LIMIT 10", [strongPattern]),
		db.query("SELECT * FROM tracks WHERE LOWER(title) LIKE $1 AND hidden=false LIMIT 10", [strongPattern]),
		db.query("SELECT DISTINCT property,value FROM track_tags WHERE LOWER(value) LIKE $1 AND property NOT IN ('featured artist', 'original artist','hyperlink') ORDER BY value ASC LIMIT 10", [weakPattern]),
		db.query("SELECT * FROM tracks WHERE LOWER(title) LIKE $1 AND hidden=false LIMIT 10", [weakPattern]),
	]

	let queryResults = await Promise.all(queries);

	let returns = queryResults[0].rows.map(x => {return {property:x.property, value:x.value, display: x.property + ": " + x.value}})
	returns = returns.concat(queryResults[1].rows.map(x => {return {id:x.id, display: x.titlecache}}));
	returns = returns.concat(queryResults[2].rows.map(x => {return {property:x.property, value:x.value, display: x.property + ": " + x.value}}))
	returns = returns.concat(queryResults[3].rows.map(x => {return {id:x.id, display: x.titlecache}}));

	let keys = new Set();

	for(let i=0; i<returns.length; i++)
	{
		let key = returns[i].id || returns[i].property + ":" + returns[i].value;

		if(keys.has(key))
		{
			returns.splice(i,1);
			i--;
		}
		else
		{
			keys.add(key);
		}
	}

	returns = returns.slice(0,10);
		
	
	res.json(returns);
});

app.get("/api/view/artists", queryProcessing, async(req,res) =>
{
	let ses = await getSession(req);
	let userID = ses && ses.user_id;
	let page = Number(req.query.page) || 0; 
	let offset = page*PAGE_COUNT;
	
	let query = `
	SELECT *, (
		SELECT COALESCE(string_agg(value, CHR(30)), '') FROM (
			SELECT DISTINCT(value)
			FROM track_tags
			WHERE track_id IN (
				SELECT track_id
				FROM track_tags
				WHERE property='artist' AND value=tablea.artist
			) AND property='genre') as td
		) as genre
	FROM (
		SELECT tracks.id, title,release_date, value as artist,
			ROW_NUMBER() OVER (PARTITION BY value ORDER BY release_date DESC) as row_number,
			(SELECT value FROM user_flags WHERE track_id=tracks.id AND user_flags.user_id='${userID}' AND flag='status') as status
		FROM tracks FULL OUTER JOIN track_tags ON tracks.id=track_tags.track_id
		WHERE property='artist' AND tracks.hidden=false
	) as tablea
	LEFT JOIN (
		SELECT COUNT(value) as tracks, value as artist
		FROM track_tags LEFT JOIN tracks on track_tags.track_id = tracks.id
		WHERE track_tags.property='artist' AND tracks.hidden=false
		GROUP BY artist
	) as tableb
	ON tablea.artist=tableb.artist
	WHERE tablea.row_number = 1
	ORDER BY release_date DESC
	LIMIT ${PAGE_COUNT} OFFSET ${offset}`;

	let {rows} = await db.query(query,[]);
	let countRequest = await db.query(`SELECT COUNT(DISTINCT(value)) FROM track_tags WHERE property='artist'`, []);
	let total = countRequest.rows[0].count;

	res.json({rows, pages: Math.ceil(total/PAGE_COUNT), total});

});

app.get("/api/view/albums", queryProcessing, async(req,res) =>
{
	let ses = await getSession(req);
	let userID = ses && ses.user_id;
	let page = Number(req.query.page) || 0; 
	let offset = page*PAGE_COUNT;
	
	let query = `
	SELECT *, (
		SELECT COALESCE(string_agg(value, CHR(30)), '') FROM (
			SELECT DISTINCT(value)
			FROM track_tags
			WHERE track_id IN (
				SELECT track_id
				FROM track_tags
				WHERE property='album' AND value=tc.album
			) AND property='artist') as td
		) as artist, (
		SELECT COALESCE(string_agg(value, CHR(30)), '') FROM (
			SELECT DISTINCT(value)
			FROM track_tags
			WHERE track_id IN (
				SELECT track_id
				FROM track_tags
				WHERE property='album' AND value=tc.album
			) AND property='genre') as td
		) as genre
	FROM (
		SELECT MAX(tb.release_date) as release_date, tb.album, COUNT(*) as tracks
		FROM (
			SELECT tracks.id, release_date, value as album
			FROM tracks FULL OUTER JOIN track_tags ON tracks.id=track_tags.track_id
			WHERE property='album' AND tracks.hidden=false
		) as tb
		GROUP BY album
		ORDER BY album
	) as tc
	ORDER BY release_date DESC
	LIMIT ${PAGE_COUNT} OFFSET ${offset}`;

	let {rows} = await db.query(query,[]);
	let countRequest = await db.query(`SELECT COUNT(DISTINCT(value)) FROM track_tags WHERE property='album'`, []);
	let total = countRequest.rows[0].count;

	res.json({rows, pages: Math.ceil(total/PAGE_COUNT), total});

})

app.get("/api/view/tracks", queryProcessing, async(req,res) =>
{
	let ses = await getSession(req);
	let userID = ses && ses.user_id;
	let page = Number(req.query.page) || 0; 
	
	let limitCount = PAGE_COUNT;
	let offset = page*PAGE_COUNT;
	

	let whereClause = await buildWhereClause(req, new Set(["artist","featured_artist","album","genre","pl","tag","release_date","status","title","remixcover"]));
	let albumNoSelect = "";
	let orderBy = "ORDER BY release_date DESC";	

	let response = {};

	if(req.query.album && req.query.album.length == 1)
	{
		albumNoSelect = `(SELECT number from track_tags WHERE track_id=id AND property='album' AND value=${sqlEscapeString(req.query.album[0])} LIMIT 1) as album_no,`;

		if(req.query.sort && req.query.sort[0] == "^album_no")
		{
			orderBy = "ORDER BY album_no ASC";
		}

		let albumHyperlinks = await db.query("SELECT meta_value FROM track_tags_metadata WHERE property='album' AND value=$1 AND meta_property='hyperlink'",[req.query.album[0]]);
		response.albumHyperlinks = albumHyperlinks.rows.map(x => x.meta_value);
	}

	if(req.query.sort && req.query.sort[0] == "^random")
	{
		orderBy = "ORDER BY random() ASC";	
		limitCount = 1;
		offset = 0;
	}

	let query = `
		SELECT id, title, release_date,
			(SELECT COALESCE(string_agg(value, CHR(30)), '') FROM track_tags WHERE track_id=id AND (property='artist' OR property='original artist')) AS artist,
			(SELECT COALESCE(string_agg(value, CHR(30)), '') FROM track_tags WHERE track_id=id AND property='featured artist') AS featured_artist, 
			(SELECT COALESCE(string_agg(value, CHR(30)), '') FROM track_tags WHERE track_id=id AND property='hyperlink') AS hyperlink,
			(SELECT COALESCE(string_agg(value, CHR(30)), '') FROM track_tags WHERE track_id=id AND property='genre') AS genre,
			(SELECT COALESCE(string_agg(value, CHR(30)), '') FROM track_tags WHERE track_id=id AND property='album') AS album,
			(SELECT COALESCE(string_agg(value, CHR(30)), '') FROM track_tags WHERE track_id=id AND property='tag') AS tag,
			(SELECT COALESCE(value, '') FROM track_tags WHERE track_id=id AND property='pl') AS pl,
			${albumNoSelect}
			(SELECT value FROM user_flags WHERE track_id=id AND user_id=$1 AND flag='status') AS status
		FROM tracks 
		${whereClause}
		${orderBy}
		LIMIT ${limitCount} OFFSET ${offset}`;

	let {rows} = await db.query(query,[userID]);
	let countRequest = await db.query(`SELECT COUNT(*) AS count FROM tracks ${whereClause}`,[]);
	let total = countRequest.rows[0].count;

	response.rows = rows;
	response.pages = Math.ceil(total/PAGE_COUNT);
	response.total = total;

	res.json(response);
});

app.get("/api/history/track/*", async(req,res) =>
{
	let id = req.params[0];

	let {rows} = await db.query(
		`SELECT track_history.*, users.name FROM track_history LEFT JOIN users ON user_id = id WHERE track_id=$1 ORDER BY timestamp DESC LIMIT ${PAGE_COUNT}`
	, [id]);

	for(let row of rows)
	{
		if(row.value.deleted || row.value.hidden != undefined){
			continue;
		}

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

	let ses = await getSession(req);
	let userID = (ses && ses.user_id) || -1;

	if(isNaN(id))
	{
		res.json({status: 400});
		return;
	}

	let trackRows = (await db.query("SELECT * FROM tracks WHERE id=$1", [id])).rows;
	let tagRows = (await db.query("SELECT * FROM track_tags WHERE track_id=$1", [id])).rows;

	let coverCount = (await db.query("SELECT COUNT(*) as count FROM track_tags WHERE property='cover' AND value=$1", [id])).rows[0].count;
	let remixCount = (await db.query("SELECT COUNT(*) as count FROM track_tags WHERE property='remix' AND value=$1", [id])).rows[0].count;

	let userFlags = (await db.query("SELECT value as status FROM user_flags WHERE track_id=$1 AND user_id=$2 AND flag='status'",[id,userID])).rows;

	let response = trackRows[0];

	if(!response)
	{
		res.json({status: 200, deleted:true});
		return;
	}

	response.tags = [];

	response.remixCount = remixCount;
	response.coverCount = coverCount;

	response.originalTracks = [];

	for(let tag of tagRows)
	{
		let newTag = {property: tag.property, value: tag.value};

		if(!isNaN(tag.number))
		{
			newTag.number = tag.number;
		}

		if(tag.property == "cover" || tag.property == "remix")
		{
			let remixRows = (await db.query("SELECT * FROM tracks WHERE id=$1", [tag.value])).rows;
			newTag.text = remixRows.length ? remixRows[0].titlecache : "Deleted track";

			if(remixRows.length)
			{
				response.originalTracks.push(remixRows[0]);
			}
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

	if(userFlags[0])
	{
		response.userFlags = {status: userFlags[0].status}; 
	}

	res.json(response);
});


app.post("/api/track", processJSON, auth(PERM.UPDATE_TRACK), async (req,res) =>
{
	var data = req.body;
	let ses = await getSession(req);
	if(!ses)
	{
		res.json({status: 400, err: "Invalid Session"});
		return;
	}
	let userID = ses.user_id;

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

	for(let tag of data.tags)
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

	titleCache = (title + ' - ' + titleCacheArtists.join(", ")).substring(0,500);

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

	let ses = await getSession(req);
	if(!ses)
	{
		res.json({status: 400, err: "Invalid Session"});
		return;
	}

	let userID = ses.user_id;

	let id = Number(data.id)

	if(isNaN(id)){
		res.json({status: 400});
	}

	if(data.hide)
	{
		await db.query("UPDATE tracks SET hidden=true WHERE id=$1", [id]);
		await db.query("INSERT INTO track_history (track_id, user_id, timestamp, value) VALUES ($1, $2, NOW(), $3)", [id, userID, {hidden:true}]);
	}
	else if(data.unhide)
	{
		await db.query("UPDATE tracks SET hidden=false WHERE id=$1", [id]);
		await db.query("INSERT INTO track_history (track_id, user_id, timestamp, value) VALUES ($1, $2, NOW(), $3)", [id, userID, {hidden:false}]);
	}
	else
	{
		await db.query("DELETE FROM tracks WHERE id=$1", [id]);	
		await db.query("DELETE FROM track_tags WHERE track_id=$1", [id]);
		await db.query("INSERT INTO track_history (track_id, user_id, timestamp, value) VALUES ($1, $2, NOW(), $3)", [id, userID, {deleted:true}]);
	}	

	res.json({status: 200, id});
});


app.post("/api/getTrackWarnings", processJSON, async (req,res) =>
{
	var data = req.body;

	let title = (data.title || "").trim();

	let sameTitle = [];
	let sameHyperlink = []
	let unknownArtists = [];


	if(data.id == "new" || data.id === undefined){
		data.id = -1;
	}

	let potentialDuplicateIDs = new Set([data.id]);
	let hasWarnings = false;

	// double check tags are okay

	for(let tag of data.tags)
	{
		if (!tag.value || typeof(tag.value) != "string") {
			res.json({status:400, error: "Invalid tag " + JSON.stringify(tag) });
			return;
		}

		let value = tag.value.trim();

		if (!tag.property || value.length == 0 || value.length > MAX_STRING_LENGTH || validProperties.indexOf(tag.property) == -1){
			res.json({status:400, error: "Invalid tag " + JSON.stringify(tag) });
			return;
		}
	}

	// check hyperlinks

	var info = "";

	for(let tag of data.tags)
	{
		if(tag.property != "hyperlink")
			continue;

		info = await db.query("SELECT a.track_id as id, b.titlecache as name FROM track_tags as a LEFT JOIN tracks as b ON a.track_id=b.id WHERE property='hyperlink' AND value=$1 AND track_id !=$2", [tag.value, data.id]);

		for(let row of info.rows)
		{
			hasWarnings = true;
			sameHyperlink.push({value: tag.value, id: row.id, name: row.name});
			potentialDuplicateIDs.add(row.id);
		}
	}

	// check title against previously released songs by this artist

	for(let tag of data.tags)
	{
		if(tag.property != "artist")
			continue;

		info = await db.query(`
			SELECT title,id,titlecache FROM tracks WHERE id IN (
				SELECT tracks.id
				FROM tracks LEFT JOIN track_tags ON tracks.id = track_tags.track_id
				WHERE property='artist' AND LOWER(value)=LOWER($1)
			)`, [tag.value]);

		for(let row of info.rows)
		{
			if(!potentialDuplicateIDs.has(row.id) && areTitlesIdentical(row.title, title))
			{
				hasWarnings = true;
				sameTitle.push({value: title, id: row.id, name: row.titlecache});
				potentialDuplicateIDs.add(row.id);
			}
		}
	}

	

	// check title - exact mathes

	info = await db.query("SELECT id, titlecache FROM tracks WHERE LOWER(title)=LOWER($2) AND id !=$1", [data.id, title]);

	for(let row of info.rows)
	{
		if(!potentialDuplicateIDs.has(row.id))
		{
			hasWarnings = true;
			sameTitle.push({value: title, id: row.id, name: row.titlecache});
			potentialDuplicateIDs.add(row.id);
		}
	}

	// check artists

	for(let tag of data.tags)
	{
		if(tag.property != "artist" && tag.property != "featured artist")
			continue;

		info = await db.query("SELECT * FROM track_tags WHERE ((property='artist' OR property='featured artist') AND LOWER(value)=LOWER($1)) LIMIT 1", [tag.value])

		if(info.rows.length == 0)
		{
			hasWarnings = true;
			unknownArtists.push(tag.value);
		}
	}

	res.json({status: 200, warnings: hasWarnings, sameTitle, sameHyperlink, unknownArtists});
	
});

app.put("/api/setTagMetadata", processJSON, auth(PERM.EDIT_TAG_METADATA), async (req,res) =>{

	let userID = (await getSession(req)).user_id;

	let validPair = false;

	let value = req.body.value;
	let property = req.body.property;
	let metaProperty = req.body.meta_property;
	let metaValue = req.body.meta_value;

	if(property == "album" && metaProperty == "hyperlink")
		validPair = true;

	if(!validPair){
		res.statusCode = 400;
		res.json({status: 400});
		console.log("bad pair")
		return;
	}


	if(!value || value == "" || !metaValue || metaValue=="")
	{
		res.statusCode = 400;
		res.json({status: 400});
		return;
	}
	
	if(req.body.is_delete)
	{
		await db.query("DELETE FROM track_tags_metadata WHERE property=$1 AND value=$2 AND meta_property=$3 AND meta_value=$4", 
			[property, value, metaProperty, metaValue]);
	}
	else
	{
		await db.query("INSERT INTO track_tags_metadata (property, value, meta_property, meta_value) VALUES ($1, $2, $3, $4) ", 
			[property, value, metaProperty, metaValue]);
	}

	await db.query("INSERT INTO track_tags_metadata_history (property, value, meta_property, meta_value, user_id, is_delete, timestamp) VALUES ($1, $2, $3, $4, $5, $6, NOW()) ", 
		[property, value, metaProperty, metaValue, userID, !!req.body.is_delete]);

	res.json({status: 200})
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


let lastGeneratedDBFile = "";
let generateLock = false;




async function buildWhereClause(req, allowedFilters)
{
	let userID ="";

	if(req.query.session)
	{
		let session = await getSession(req);
		userID = session ? session.user_id : "";
	}

	let session = req.query.session;

	let whereClause = "";
	let whereClauses = ["hidden=false"];

	let simpleFilters = ["artist","featured_artist","album","genre","pl","tag","remixcover"];
	
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

	let propertyClause = `property='${property}'`;
	if(property == "artist")
	{
		propertyClause = `(property='artist' OR property='original artist')`;
	}

	if(property == "remixcover")
	{
		propertyClause = `(property='remix' OR property='cover')`;
	}

	if(negate)
	{
		if(valueListNoNulls.length)
		{
			clauses.push(`id NOT IN (SELECT track_id FROM track_tags WHERE value IN (${valueListNoNulls}) AND ${propertyClause})`)
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
			clauses.push(`id IN (SELECT track_id FROM track_tags WHERE value IN (${valueListNoNulls}) AND ${propertyClause})`)
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
	// pipes are fine within a string

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
	for(let key in req.query)
	{
		let s = req.query[key].replace(/,,/g, "\uE000");
		s = s.split(",");
		s = s.map(x => x.replace(/\uE000/g, ","));
		req.query[key] = s;
	}

	next();
}

app.get("/export/db", queryProcessing, async (req,res) => {

	let pullKey = "";

	if(req.query.PULL_KEY && req.query.PULL_KEY[0])
	{
		pullKey = req.query.PULL_KEY[0]
	}

	if(generateLock)
	{
		res.status(500).send("Generating File, try again later");
		return;
	}

	let date = new Date().toISOString().substring(0,10);

	if(lastGeneratedDBFile < date)
	{
		generateLock = true;
		lastGeneratedDBFile = date;

		console.log("EXPORTING DATA");

		await loader.doExport();

		generateLock = false;
	}	

	if(pullKey == process.env.PULL_KEY)
	{
		res.sendFile(path.resolve(process.cwd(), 'fullExport.sql'), {maxAge: 0});
	}
	else
	{
		res.redirect("/export/export.sql");
	}

});

app.get('*', queryProcessing, (req, res) =>
{
	let filePath = path.resolve(process.cwd(), 'public', req.url);
	if(fs.existsSync("./public" + filePath))
	{
		res.sendFile(filePath);
		return;
	}
	res.sendFile(path.resolve(process.cwd(), 'public', 'index.html'));
 });


async function handleExport(req,res)
{
	
}


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


