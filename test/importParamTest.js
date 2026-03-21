import * as assert from 'assert';
import {parseImportParams} from "../src/titleParsing.js";

function assertHasTag(tags, property, value)
{
	let match = tags.find(t => t.property === property && t.value === value);
	assert.ok(match, `expected tag ${property}:${value} — got ${JSON.stringify(tags)}`);
}

function assertDoesNotHaveTag(tags, property, value)
{
	let match = tags.find(t => t.property === property && t.value === value);
	assert.ok(!match, `unexpected tag ${property}:${value} — got ${JSON.stringify(tags)}`);
}

describe('parseImportParams', function ()
{
	// based off of https://www.youtube.com/watch?v=pyky5YwgrrA
	it('splits the artist tag if it contains " and "', function ()
	{
		let { title, tags } = parseImportParams("title=Dijit %26amp%3B Koa - Roses In Her Shoes [Future Bass]&date=Dec 5%2C 2025&artist=Ponies At Dawn and CreatureCore&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dpyky5YwgrrA");
		assertHasTag(tags, "artist", "Ponies At Dawn");
		assertHasTag(tags, "artist", "CreatureCore");
	});

	// based off of https://www.youtube.com/watch?v=7mEPHiniwwY
	it('splits the artist tag if it contains " and 2 more"', function ()
	{
		let { title, tags } = parseImportParams("title=GNG %26amp%3B Koa - Reminiscence [Pop%2FNightcore]&date=Jan 9%2C 2026&artist=Ponies At Dawn and 2 more&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D7mEPHiniwwY");
		assertHasTag(tags, "artist", "Ponies At Dawn");
		assertDoesNotHaveTag(tags, "artist", "2 more");
	});

	// based off of https://soundcloud.com/vyletpony/livelaughlove2-ft-moesnail-15?in=vadiana/sets/vylet
	it("splits out <svg> tags in the artist field", function () {
		let {title, tags} = parseImportParams("?title=LiveLaughLove2%20(ft.%20Moesnail)&date=2025-07-12&artist=Vylet%20Pony%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%3Cdiv%20style%3D%22display%3A%20inline-block%22%3E%3Cspan%20class%3D%22verifiedBadge%20soundTitle__usernameHeroContainer__verifiedBadge%20sc-ml-1x%20theme-light%22%3E%3Csvg%20viewBox%3D%220%200%2016%2016%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20aria-hidden%3D%22false%22%3E%3Ctitle%3EVerified%3C%2Ftitle%3E%3Cpath%20d%3D%22M15%208A7%207%200%20111%208a7%207%200%200114%200z%22%20fill%3D%22currentColor%22%3E%3C%2Fpath%3E%3Cpath%20d%3D%22M11.97%204.7l1.06%201.06-6.53%206.531-3.53-3.53L4.03%207.7l2.47%202.47%205.47-5.47z%22%20fill%3D%22%23fff%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E%3C%2Fspan%3E%3C%2Fdiv%3E&url=https%3A%2F%2Fsoundcloud.com%2Fvyletpony%2Flivelaughlove2-ft-moesnail-15%3Fin%3Dvadiana%2Fsets%2Fvylet");

		assertHasTag(tags, "artist", "Vylet Pony");
	});

	// based off of https://www.youtube.com/watch?v=1l7uXFGQ_G4
	it("handles premiered dates okay", function(){

		let { release_date,} = parseImportParams("title=【Music】ANTONYMPH (Vylet Ponystep Remix)&date=Premiered Jun 18%2C 2022&artist=Vylet Pony&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D1l7uXFGQ_G4");
		assert.equal(release_date, "2022-06-18");
	})
});

describe('parseImportParams — basic tests', function ()
{
	// based off of https://www.youtube.com/watch?v=Oe-BoD-sJkY
	it('gets all the basics right', function ()
	{
		let { title, release_date, scrapedTitle, tags } = parseImportParams("title=brambleshadow4 - Take Me Back to 2014&date=Jul 28%2C 2024&artist=brambleshadow4&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DOe-BoD-sJkY");
		assertHasTag(tags, "artist", "brambleshadow4");
		assertHasTag(tags, "hyperlink", "https://www.youtube.com/watch?v=Oe-BoD-sJkY");
		assert.equal(title, "Take Me Back to 2014");
		assert.equal(scrapedTitle,"brambleshadow4 - Take Me Back to 2014")
		assert.equal(release_date,"2024-07-28");
	});
});