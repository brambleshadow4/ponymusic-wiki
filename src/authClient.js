
export function hasPerm(perm)
{
	let role = sessionStorage.role || ROLE.DEFAULT;
	console.log(role);
	return lookup[role][perm]
}


const ROLE = {
	DEFAULT: "1",
	ADMIN: "2",
	MODERATOR: "3",
	VERIFIED_USER: "4",
	USER: "5",
}

export const PERM = {
	UPDATE_TRACK: "1",
	DELETE_TRACK: "2",
	LOCK_TRACK: "3",
	UNLIMITED_EDITS: "4",
}

const lookup = {}

lookup[ROLE.DEFAULT] = {};

lookup[ROLE.ADMIN] = {};
lookup[ROLE.ADMIN][PERM.UPDATE_TRACK] = true;
lookup[ROLE.ADMIN][PERM.DELETE_TRACK] = true;
lookup[ROLE.ADMIN][PERM.LOCK_TRACK] = true;
lookup[ROLE.ADMIN][PERM.UNLIMITED_EDITS] = true;

lookup[ROLE.MODERATOR] = {};
lookup[ROLE.MODERATOR][PERM.UPDATE_TRACK] = true;
lookup[ROLE.MODERATOR][PERM.DELETE_TRACK] = true;
lookup[ROLE.MODERATOR][PERM.LOCK_TRACK] = true;
lookup[ROLE.MODERATOR][PERM.UNLIMITED_EDITS] = true;

lookup[ROLE.VERIFIED_USER] = {};
lookup[ROLE.VERIFIED_USER][PERM.UPDATE_TRACK] = true;
lookup[ROLE.VERIFIED_USER][PERM.DELETE_TRACK] = true;
lookup[ROLE.VERIFIED_USER][PERM.UNLIMITED_EDITS] = true;

lookup[ROLE.USER] = {};
lookup[ROLE.USER][PERM.UPDATE_TRACK] = true;
