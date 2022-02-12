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
app.use(cors());

// getOgPropertiesFromURL("http://www.brambleshadow4.net/music/dustcar-37/", {logProperties:true});

db = new Pool();


let tableQueries = fs.readFileSync("./server/tables.sql", {encoding:'utf8'})
	.split(";");

for (query of tableQueries)
{
	db.query(query, (err, res) =>
	{
		if(err) {
			process.exit(1);
			//throw new Error(err);
		}
	});
}

app.use(express.static('public'));

app.post("/api/login", processJSON, async (req,res) =>{

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

	if(property == "" || !req.body.value){
		res.json([]);
		return;
	}

	let pattern = req.body.value.replace(/%/,"\\%").toLowerCase();
	pattern = "%" + pattern + "%";

	if(property == "artist" || property == "featured artist") {
		var {rows} = await db.query("SELECT DISTINCT value FROM track_tags WHERE (property = 'artist' OR property = 'featured artist') and LOWER(value) LIKE $1", [pattern]);
	}
	else {
		var {rows} = await db.query("SELECT DISTINCT value FROM track_tags WHERE property = $1 and LOWER(value) LIKE $2", [property, pattern]);
	}

	let strippedRows = rows.map(x => {return {text: x.value, value: x.value, property}});

	res.json(strippedRows);
})

app.get("/api/view/tracks", async(req,res) => {

	let tagFilter = '(tag "artist" "vylet pony")';
	let order = "(desc release_date)"

	let {rows} = await db.query(`
		SELECT id, title, release_date,
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='artist') as artist, 
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='hyperlink') as hyperlink,
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='genre') as genre,
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='album') as album,
			(SELECT COALESCE(value, '') from track_tags WHERE track_id=id and property='pl') as pl
		FROM tracks 
		ORDER BY release_date DESC
		`, []);

	res.json(rows);
});


// 
app.get("/api/history/track/*", async(req,res) =>{

	let id = req.params[0];

	let {rows} = await db.query(
		`SELECT track_history.*, users.name FROM track_history LEFT JOIN users ON user_id = id WHERE track_id=$1 ORDER BY timestamp DESC LIMIT 200`
	, [id]);

	let response = rows || {status: 400};
	res.json(response);

});


app.get("/api/track/*", async(req,res) =>{

	let id = req.params[0];
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
	let ogcache = await getOgCache(data);

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

		await db.query("UPDATE tracks SET title=$1, release_date=$2, ogcache=$3 WHERE id=$4", [title, release_date, ogcache, id]);		
	}

	await db.query("DELETE FROM track_tags WHERE track_id=$1", [id]);

	for(tag of data.tags)
	{
		if (!tag.property || !tag.value){
			continue;
		}

		if(!isNaN(tag.number)){
			await db.query("INSERT INTO track_tags (track_id, property, value, number) VALUES ($1, $2, $3, $4)", [id, tag.property, tag.value, tag.number]);
		}
		else {
			await db.query("INSERT INTO track_tags (track_id, property, value) VALUES ($1, $2, $3)", [id, tag.property, tag.value,]);
		}
	}

	let userID = (await getSession(req)).user_id;
	await db.query("INSERT INTO track_history (track_id, user_id, timestamp, value) VALUES ($1, $2, NOW(), $3)", [id, userID, {title, release_date, tags: data.tags}]);

	res.json({status: 200, id});
});


function processJSON(req, res, next){

	let doTheThing = bodyParser.text({type: "text/json"});

	doTheThing(req, res, function(){

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


app.get('*', (req, res) => {
	res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
	console.log(`Server is up at port ${port}`);
});


