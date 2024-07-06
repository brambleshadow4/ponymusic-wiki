
import dotenv from "dotenv";
dotenv.config();


import pg from "pg";
const {Pool} = pg;
let db = new Pool();


let ids = [4822, 3107, 2997, 629, 1078, 232, 98, 80, 1516, 1628, 1605, 4603, 4726, 4727, 4735, 4728, 4729, 4730, 4731, 4732, 4733, 4734, 4736, 4737, 4738, 4840, 4843, 4849, 4874, 5066, 2228, 1051, 5147, 5118, 5112, 5034, 5042, 4543, 5327, 5386, 5926, 5929, 5972, 5973, 5740, 6138, 6186, 6266, 5739, 6850, 7092, 6656, 7484, 1701, 1925, 11936, 11969, 11724, 11696, 5033, 12010, 12016, 11720, 9333, 5593, 9329, 11757, 5619, 5722, 5640, 4783, 10278, 11836, 11902, 4781, 4721, 4719, 4725, 4724, 4782, 4777, 4720, 4723, 4722, 4718, 5243, 10289, ]

run();

async function convertOne(id)
{
	let response = await db.query("SELECT * FROM track_history WHERE track_id=$1 ORDER BY timestamp ASC",[id]);
	console.log(response.rows)

	if(! (process.argv[2] == "--apply"))
	{
		console.log("use --apply to apply")
		return
	}

	console.log(id);

	let hidden = false;
	for(let i=0; i< response.rows.length; i++)
	{
		let row = response.rows[i];
		if(row.value.hidden == undefined)
		{
			row.value.hidden = hidden;
		}
		else if (!row.value.tags && row.value.hidden !== undefined)
		{
			hidden = row.value.hidden;
			row.value.tags = response.rows[i-1].value.tags;
			row.value.release_date = response.rows[i-1].value.release_date;
			row.value.title = response.rows[i-1].value.title;

		}

		await db.query("UPDATE track_history SET value=$1 WHERE track_id=$2 AND timestamp=$3",[row.value, id, row.timestamp]);
	}

}

// checkout 11902

async function run()
{

	for(let id of ids)
	{
		await convertOne(id);
	}
	
	process.exit()
}

