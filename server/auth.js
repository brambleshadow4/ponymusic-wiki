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
	UNLIMITED_EDITS: "4",
	USER_FLAGS: "5",
}

const lookup = {}

lookup[ROLE.DEFAULT] = {};

lookup[ROLE.ADMIN] = {};
lookup[ROLE.ADMIN][PERM.UPDATE_TRACK] = true;
lookup[ROLE.ADMIN][PERM.DELETE_TRACK] = true;
lookup[ROLE.ADMIN][PERM.LOCK_TRACK] = true;
lookup[ROLE.ADMIN][PERM.UNLIMITED_EDITS] = true;
lookup[ROLE.ADMIN][PERM.USER_FLAGS] = true;

lookup[ROLE.MODERATOR] = {};
lookup[ROLE.MODERATOR][PERM.UPDATE_TRACK] = true;
lookup[ROLE.MODERATOR][PERM.DELETE_TRACK] = true;
lookup[ROLE.MODERATOR][PERM.LOCK_TRACK] = true;
lookup[ROLE.MODERATOR][PERM.UNLIMITED_EDITS] = true;
lookup[ROLE.MODERATOR][PERM.USER_FLAGS] = true;

lookup[ROLE.VERIFIED_USER] = {};
lookup[ROLE.VERIFIED_USER][PERM.UPDATE_TRACK] = true;
lookup[ROLE.VERIFIED_USER][PERM.DELETE_TRACK] = true;
lookup[ROLE.VERIFIED_USER][PERM.UNLIMITED_EDITS] = true;
lookup[ROLE.VERIFIED_USER][PERM.USER_FLAGS] = true;

lookup[ROLE.USER] = {};
lookup[ROLE.USER][PERM.UPDATE_TRACK] = true;
lookup[ROLE.USER][PERM.USER_FLAGS] = true;

db = new Pool();

let sessions = {}; // string => {id: ###} map


function reqHasPerm(req, permission)
{
	let ses = req.body && req.body.session;
	let role = (sessions[ses] && sessions[ses].role) || ROLE.DEFAULT;

	return lookup[role][permission];
}

async function buildSession(req)
{
	let ses = (req.body && req.body.session) || (req.query && req.query.session[0]);
	let now = new Date().getTime();

	if(!sessions[ses] || sessions[ses].expire_time.getTime() >= now)
	{
		delete sessions[ses];

		await db.query("DELETE FROM sessions WHERE expire_time < NOW()")

		let {rows, err} = await db.query(`
			SELECT * FROM sessions LEFT JOIN users ON user_id=id WHERE sessions.session = $1
		`, [ses]);

		if(rows[0] && rows[0].expire_time.getTime() >= now)
		{
			sessions[ses] = rows[0];
		}
	}
}

async function getSession(req)
{
	await buildSession(req);
	return sessions[req.body ? req.body.session : req.query.session];
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

		res.json({status:403, error: "Insufficient permissions"});
	}
}

module.exports = {
	PERM, ROLE, auth, reqHasPerm, getSession
}