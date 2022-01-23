require('dotenv').config()
const cors = require('cors');
const path = require('path');
const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const {Pool, Client} = require('pg');

const {addOgCacheTag, getOgPropertiesFromURL} = require('./server/helpers.js');

const app = express();
const port = process.env.PORT || 80;
app.use(cors());


getOgPropertiesFromURL("http://www.brambleshadow4.net/music/dustcar-37/", {logProperties:true});


db = new Pool();

let tableQueries = fs.readFileSync("./server/tables.sql", {encoding:'utf8'})
	.split(";");

for (query of tableQueries)
{
	db.query(query, (err, res) =>
	{
		if(err) {
			console.log(query);
			console.error(err);
			process.exit(1);
			//throw new Error(err);
		}
	});
}

app.use(express.static('public'));


app.post("/api/autocomplete/artist", bodyParser.text({ type: 'text/plain' }), async (req,res) =>
{
	console.log(req.body);

	let name = req.body.replace(/%/,"\\%").toLowerCase();
	name = "%" + name + "%";
	let {rows} = await db.query("SELECT * FROM artists WHERE LOWER(name) LIKE $1 LIMIT 20", [name]);

	console.log(rows);

	let strippedRows = rows.map(x => [x.id, x.name]);
	res.json(strippedRows);
})

app.get("/api/view/tracks", async(req,res) => {

	//console.log(req.query);

	let tagFilter = '(tag "artist" "vylet pony")';
	let order = "(desc release_date)"



	let {rows} = await db.query(`
		SELECT id, title, release_date,
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='artist') as artist, 
			(SELECT COALESCE(string_agg(value, CHR(30)), '') from track_tags WHERE track_id=id and property='hyperlink') as hyperlink
		FROM tracks 
		ORDER BY release_date DESC
		`, []);

	res.json(rows);
});

app.get("/api/track/*", async(req,res) =>{

	let id = req.params[0];
	let trackRows = (await db.query("SELECT * FROM tracks WHERE id=$1", [id])).rows;
	let tagRows = (await db.query("SELECT * FROM track_tags WHERE track_id=$1", [id])).rows;

	let response = trackRows[0] || {status: 400};
	response.tags = [];

	for(tag of tagRows)
	{
		if(!isNaN(tag.number)){
			response.tags.push({property: tag.property, value: tag.value, number: tag.number});
		}
		else{
			response.tags.push({property: tag.property, value: tag.value});
		}
	}

	if(!response.status){
		response.status = 200;
	}

	res.json(response);
});

app.post("/api/track", bodyParser.text({type: "text/json"}), async (req,res) =>
{
	// TODO auth.

	var data;

	try {
		data = JSON.parse(req.body)
	}
	catch(e){
		res.json({status:400});
		return;
	}

	//console.log(data);

	let title = (data.title || "").trim();
	let release_date = data.release_date.trim();


	if(isNaN(new Date(release_date).getTime())){
		res.json({status:400});
		return;
	}


	if(title.length == 0){
		return;
	}

	let id = data.id;


	// validate tags 

	if(id == "new")
	{
		let x = await db.query("INSERT INTO tracks (title, release_date, locked) VALUES ($1, $2, false) RETURNING id", [title, release_date]);

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

		await db.query("UPDATE tracks SET title=$1, release_date=$2 WHERE id=$3", [title, release_date, id]);		
	}

	await db.query("DELETE FROM track_tags WHERE track_id=$1", [id]);

	data = await addOgCacheTag(data);

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

	res.json({status: 200, id});
});


app.get('*', (req, res) => {
	res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
	console.log(`Server is up at port ${port}`);
});


