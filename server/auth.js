/**
 * Various helper functions + middleware to establish
 * authentication for the connecting user
 */ 

import dotenv from "dotenv";
dotenv.config();

import pg from "pg";

export {
	PERM, ROLE, auth, reqHasPerm, getSession
}


/************ SHARED CODE W/ authClient.js, copy paste this *****************/
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
	HIDE_TRACK: "7",
	LOCK_TRACK: "3",
	UNLIMITED_EDITS: "4",
	USER_FLAGS: "5",
	EDIT_TAG_METADATA: "6",
	EDIT_LISTS: "7",
}

const lookup = {}

lookup[ROLE.DEFAULT] = {};

lookup[ROLE.ADMIN] = {};
lookup[ROLE.ADMIN][PERM.UPDATE_TRACK] = true;
lookup[ROLE.ADMIN][PERM.DELETE_TRACK] = true;
lookup[ROLE.ADMIN][PERM.HIDE_TRACK] = true;
lookup[ROLE.ADMIN][PERM.LOCK_TRACK] = true;
lookup[ROLE.ADMIN][PERM.UNLIMITED_EDITS] = true;
lookup[ROLE.ADMIN][PERM.USER_FLAGS] = true;
lookup[ROLE.ADMIN][PERM.EDIT_TAG_METADATA] = true;
lookup[ROLE.ADMIN][PERM.EDIT_LISTS] = true;

lookup[ROLE.MODERATOR] = {};
lookup[ROLE.MODERATOR][PERM.UPDATE_TRACK] = true;
lookup[ROLE.MODERATOR][PERM.DELETE_TRACK] = true;
lookup[ROLE.MODERATOR][PERM.HIDE_TRACK] = true;
lookup[ROLE.MODERATOR][PERM.LOCK_TRACK] = true;
lookup[ROLE.MODERATOR][PERM.UNLIMITED_EDITS] = true;
lookup[ROLE.MODERATOR][PERM.USER_FLAGS] = true;
lookup[ROLE.MODERATOR][PERM.EDIT_TAG_METADATA] = true;
lookup[ROLE.MODERATOR][PERM.EDIT_LISTS] = true;

lookup[ROLE.VERIFIED_USER] = {};
lookup[ROLE.VERIFIED_USER][PERM.UPDATE_TRACK] = true;
lookup[ROLE.VERIFIED_USER][PERM.DELETE_TRACK] = true;
lookup[ROLE.VERIFIED_USER][PERM.HIDE_TRACK] = true;
lookup[ROLE.VERIFIED_USER][PERM.UNLIMITED_EDITS] = true;
lookup[ROLE.VERIFIED_USER][PERM.USER_FLAGS] = true;
lookup[ROLE.VERIFIED_USER][PERM.EDIT_TAG_METADATA] = true;
lookup[ROLE.VERIFIED_USER][PERM.EDIT_LISTS] = true;

lookup[ROLE.USER] = {};
lookup[ROLE.USER][PERM.UPDATE_TRACK] = true;
lookup[ROLE.USER][PERM.USER_FLAGS] = true;
lookup[ROLE.USER][PERM.EDIT_LISTS] = true;

/************END SHARED CODE*************************/

const db = new pg.Pool();

let sessions = {}; // string => {id: ###} map


function reqHasPerm(req, permission)
{
	let ses = (req.body && req.body.session) || (req.query && req.query.session && req.query.session[0]);
	let role = (sessions[ses] && sessions[ses].role) || ROLE.DEFAULT;

	return lookup[role][permission];
}

async function buildSession(req)
{
	let ses = (req.body && req.body.session) || (req.query && req.query.session && req.query.session[0]);
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
	
	let ses = (req.body && req.body.session) || (req.query && req.query.session);

	if(typeof ses == "object"){
		ses = ses[0];
	}

	return sessions[ses];
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

