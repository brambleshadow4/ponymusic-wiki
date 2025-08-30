
export function hasPerm(perm)
{
	let role = localStorage.role || ROLE.DEFAULT;
	return lookup[role][perm]
}

/************ SHARED CODE W/ auth.js, copy paste this *****************/
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
/************ END SHARED CODE *****************/

export {PERM, ROLE};