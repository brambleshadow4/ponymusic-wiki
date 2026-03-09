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