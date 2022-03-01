/**
 * Various helper functions + middleware to establish
 * authentication for the connecting user
 */ 

require('dotenv').config()
const {Pool} = require('pg');

const ROLE = {
	DEFAULT: "1",
	ADMIN: "2",
	MODERATOR: "3",
	VERIFIED_USER: "4",
	USER: "5",
}

const PERM = {
	UPDATE_TRACK: "1",
	DELETE_TRACK: "2",
	LOCK_TRACK: "3",
}

const lookup = {}

lookup[ROLE.DEFAULT] = {};

lookup[ROLE.ADMIN] = {};
lookup[ROLE.ADMIN][PERM.UPDATE_TRACK] = true;
lookup[ROLE.ADMIN][PERM.DELETE_TRACK] = true;
lookup[ROLE.ADMIN][PERM.LOCK_TRACK] = true;

lookup[ROLE.MODERATOR] = {};
lookup[ROLE.MODERATOR][PERM.UPDATE_TRACK] = true;
lookup[ROLE.MODERATOR][PERM.DELETE_TRACK] = true;
lookup[ROLE.MODERATOR][PERM.LOCK_TRACK] = true;

lookup[ROLE.VERIFIED_USER] = {};
lookup[ROLE.VERIFIED_USER][PERM.UPDATE_TRACK] = true;
lookup[ROLE.VERIFIED_USER][PERM.DELETE_TRACK] = true;

lookup[ROLE.USER] = {};
lookup[ROLE.USER][PERM.UPDATE_TRACK] = true;


db = new Pool();

let sessions = {}; // string => {id: ###} map


function reqHasPerm(req, permission)
{
	let ses = req.body && req.body.session;
	let role = (sessions[ses] && sessions[ses].role) || ROLE.DEFAULT;

	console.log(role);
	return lookup[role][permission];
}

async function buildSession(req)
{
	let ses = req.body && req.body.session;
	let now = new Date().getTime();

	if(!sessions[ses] || sessions[ses].expire_time.getTime() >= now)
	{
		delete sessions[ses];

		let {rows, err} = await db.query(`
			SELECT * FROM sessions LEFT JOIN users ON user_id=id WHERE sessions.session = $1
		`, [ses]);

		console.log(rows);

		if(rows[0] && rows[0].expire_time.getTime() >= now)
		{
			sessions[ses] = rows[0];
		}
	}
}

async function getSession(req)
{
	await buildSession(req);
	return sessions[req.body.session];
}

function auth(permission)
{
	return async function(req, res, next)
	{
		await buildSession(req);

		if(reqHasPerm(req, permission))
		{
			next();
			return;
		}

		res.json({status:403});
	}
}

module.exports = {
	PERM, auth, reqHasPerm, getSession
}