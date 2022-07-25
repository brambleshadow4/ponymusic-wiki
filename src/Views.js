import {plEnumText, statusIcon, Columns} from "./helpers.js";


let DefaultView = {
	htmlTitle: "<h1 class='no-margin'>Pony Music Wiki <span class='version'>(alpha build)</span></h1><div>A community maintained database of pony music.</div>",
	tabs: [
		{
			name: "(default)",
			columns: [

				{name: "", width: "25", property: "status", printFn: statusIcon, icon:true, filtered: false},
				{name: "Artist", width: "200", property: "artist", linkTo:"/artist/*",  filtered: false,},
				{name: "Featured Arist", width: "50", property: "featured_artist", linkTo:"/artist/*", filtered: false},
				{name: "Title", width: "200", property: "title", filtered: false},
				{name: "Album", width: "100", property: "album", linkTo: "/album/*", filtered: false},
				{name: "Refs", width: "100", property: "pl", transform: plEnumText, filtered: false},
				{name: "Genre", width: "100", property: "genre", filtered: false},
				{name: "Tags", width: "100", property: "tag", filtered: false},
				{name: "Released", width: "100", property: "release_date", transform: (x) => [x.substring(0,10)], filtered: false}
			]
		}
	]
}

let ArtistView = {
	makeTitle: function(){
		let artistName = decodeURIComponent(location.pathname.replace("/artist/","").trim());
		return "Artist: " + artistName;
	},
	tabs: [
		{
			name: "Releases",
			columns: [
				Columns.Status,
				{name: "Collaborators", width: "100", transform: filterArtist, linkTo:"/artist/*"},
				Columns.Title,
				Columns.Album,
				Columns.Refs,
				Columns.Genre,
				Columns.Tags,
				Columns.Released
			],

			filter: function(filters) {
				let artistName = decodeURIComponent(location.pathname.replace("/artist/","").trim());
				let filterCopy = JSON.parse(JSON.stringify(filters));
				filterCopy.artist = {include: [artistName]};
				return filterCopy;
			}
		},
		{
			name: "Features",
			columns: [
				Columns.Status,
				{name: "Collaborators", width: "100", transform: filterArtist, linkTo:"/artist/*"},
				Columns.Title,
				Columns.Album,
				Columns.Refs,
				Columns.Genre,
				Columns.Tags,
				Columns.Released
			],

			filter: function(filters) {
				let artistName = decodeURIComponent(location.pathname.replace("/artist/","").trim());
				let filterCopy = JSON.parse(JSON.stringify(filters));
				filterCopy.featured_artist = {include: [artistName]};
				return filterCopy
			}
		}
	],
}


function filterArtist(row)
{
	let artistName = decodeURIComponent(location.pathname.replace("/artist/","").trim());
	let allArtists = (row.artist && row.featured_artist ? row.artist + "\x1E" + row.featured_artist : row.artist + row.featured_artist)
	return allArtists.split("\x1E").filter(x => x != artistName);
}

export {DefaultView, ArtistView}