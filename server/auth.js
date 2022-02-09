require('dotenv').config()
const {Pool} = require('pg');

const ROLE = {
	ADMIN: "1",
	DEFAULT: "2",

}

const PERM = {
	UPDATE_TRACK: "1",
	DELETE_TRACK: "2",
}

const lookup = {}

lookup[ROLE.ADMIN] = {};
lookup[ROLE.ADMIN][PERM.UPDATE_TRACK] = true;
lookup[ROLE.ADMIN][PERM.DELETE_TRACK] = true;

lookup[ROLE.DEFAULT] = {};


db = new Pool();

let sessions = {}; // string => {id: ###} map


if (process.env.SESSIONS)
{
	let envSessions = process.env.SESSIONS.split(",");

	for(let pair of envSessions)
	{
		console.log(pair);
		let [sessionID, userID, role] = pair.split("/");

		sessions[sessionID] = {user: userID, role, expireTime: new Date("3000-01-01")};
	}
}


function reqHasPerm(req, permission)
{
	let ses = req.body && req.body.session;
	let role = sessions[ses] && sessions[ses].role || ROLE.DEFAULT;
	return lookup[role][permission];
}

async function checkSession(req)
{
	let ses = req.body && req.body.session;
	let now = Date();
	if(!sessions[ses] || sess)
}

function auth(permission)
{
	return function(req, res, next){

		console.log(req.body);
		console.log(req.body.session)

		if(reqHasPerm(req, permission)){

			req.body.userID = 

			next();
			return;
		}

		res.json({status:403});
	}
}

module.exports = {
	PERM, auth, reqHasPerm
}