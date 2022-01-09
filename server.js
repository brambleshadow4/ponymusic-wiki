require('dotenv').config()
const cors = require('cors');
const path = require('path');
const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');

const {Pool, Client} = require('pg');

const app = express();
const port = process.env.PORT || 80;
app.use(cors());

console.log("this is running");

db = new Pool();

let tableQueries = fs.readFileSync("./server/tables.sql", {encoding:'utf8'})
	.split(";");

for (query of tableQueries)
{
	db.query(query, (err, res) =>
	{
		if(err) {
			throw new Error(err);
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

app.post("/api/view/artists", bodyParser.json(), async(req,res) => {

	let {rows} = await db.query("SELECT * FROM artists ORDER BY name LIMIT 100", []);
	res.json(rows);

});

app.get("/api/artist/*", async(req,res) =>{

	let {rows} = await db.query("SELECT * FROM artists WHERE id=$1", [req.params[0]]);

	let response = rows[0] || {status: 400};

	if(!response.status){
		response.status = 200;
	}

	res.json(response);
});

app.post("/api/artist/*", bodyParser.text({type: "text/json"}), async (req,res) =>
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

	let name = (data.name || "").trim();

	if(name.length == 0){
		return;
	}

	if(data.id == "new")
	{
		let x = await db.query("INSERT INTO artists (name, locked) VALUES ($1, false) RETURNING id", [name]);

		if(x.err)
		{
			res.json({status:400});
		}
		else
		{
			res.json({status:200, newId: x.rows[0].id})
		}
	}
	else 
	{
		id = Number(data.id)

		if(isNaN(id)){
			res.json({status: 400});
		}

		await db.query("UPDATE artists SET name=$1 WHERE id=$2", [name, id]);

		res.json({status:200});
	}
})


app.get('*', (req, res) => {
	res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
	console.log(`Server is up at port ${port}`);
});