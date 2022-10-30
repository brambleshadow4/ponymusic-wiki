import {plEnumText, statusIcon, Columns} from "./helpers.js";


let DefaultView = {
	api: "/api/view/tracks",
	htmlTitle: "<h1 class='no-margin'>Pony Music Wiki <span class='version'>(alpha build)</span></h1><div>A community maintained database of pony music.</div>",
	hasButtonNewTrack: true,
	hasButtonRandomTrack: true,
	tabs: [
		{
			name: "(default)",
			columns: [
				Columns.Status,
				{name: "Artist", width: "200", property: "artist", linkTo:"/artist/*",  filtered: false},
				{name: "Featured Arist", width: "50", property: "featured_artist", linkTo:"/artist/*", filtered: false},
				Columns.Title,
				Columns.Album,
				Columns.Refs,
				Columns.Genre,
				Columns.Tags,
				Columns.Released
			]
		}
	]
}

let ArtistView = {
	api: "/api/view/tracks",
	hasButtonRandomTrack: true,
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

let AlbumView = {
	api: "/api/view/tracks",
	hasButtonRandomTrack: true,
	makeTitle: function(){
		let albumName = decodeURIComponent(location.pathname.replace("/album/","").trim());
		return "Album: " + albumName;
	},
	tabs: [
		{
			name: "(default)",
			columns: [
				Columns.Status,
				{name: "", width: "25", property: "album_no"},
				{name: "Artist", width: "200", property: "artist", filtered: false, linkTo:"/artist/*"},
				{name: "Featured Arist", width: "50", property: "featured_artist", filtered: false, linkTo:"/artist/*"},
				Columns.Title,
				Columns.Refs,
				Columns.Genre,
				Columns.Tags,
			],
			sort: [{asc: "album_no"}],
			filter: function(filters) {
				let albumName = decodeURIComponent(location.pathname.replace("/album/","").trim());
				let filterCopy = JSON.parse(JSON.stringify(filters));
				filterCopy.album = {include: [albumName]};
				return filterCopy;
			}
		}
	]
}

let TagView = {
	api: "/api/view/tracks",
	makeTitle: function(){
		let tagName = decodeURIComponent(location.pathname.replace("/tag/","").trim());
		return "Tag: " + tagName;
	},
	hasButtonNewTrack: true,
	hasButtonRandomTrack: true,
	tabs: [
		{
			name: "(default)",
			columns: [
				Columns.Status,
				{name: "Artist", width: "200", property: "artist", linkTo:"/artist/*",  filtered: false},
				{name: "Featured Arist", width: "50", property: "featured_artist", linkTo:"/artist/*", filtered: false},
				Columns.Title,
				Columns.Album,
				Columns.Refs,
				Columns.Genre,
				Columns.Tags,
				Columns.Released
			],
			filter: function(filters) {
				let tagName = decodeURIComponent(location.pathname.replace("/tag/","").trim());
				let filterCopy = JSON.parse(JSON.stringify(filters));
				filterCopy.tag = {include: [tagName]};
				return filterCopy;
			}
		}
	]
}

let GenreView = {
	api: "/api/view/tracks",
	makeTitle: function(){
		let genreName = decodeURIComponent(location.pathname.replace("/genre/","").trim());
		return "Genre: " + genreName;
	},
	hasButtonNewTrack: true,
	hasButtonRandomTrack: true,
	tabs: [
		{
			name: "(default)",
			columns: [
				Columns.Status,
				{name: "Artist", width: "200", property: "artist", linkTo:"/artist/*",  filtered: false},
				{name: "Featured Arist", width: "50", property: "featured_artist", linkTo:"/artist/*", filtered: false},
				Columns.Title,
				Columns.Album,
				Columns.Refs,
				Columns.Genre,
				Columns.Tags,
				Columns.Released
			],
			filter: function(filters) {
				let genreName = decodeURIComponent(location.pathname.replace("/genre/","").trim());
				let filterCopy = JSON.parse(JSON.stringify(filters));
				filterCopy.genre = {include: [genreName]};
				return filterCopy;
			}
		}
	]
}

let RemixCoverView = {
	api: "/api/view/tracks",
	hasButtonRandomTrack: true,
	makeTitle: function(){
		let piece = location.pathname.substring("/remix/".length);
		let trackURI = piece.substring(piece.indexOf("-")+1);
		let trackName = decodeURIComponent(trackURI).trim();
		return "Remixes + Covers of: " + trackName;
	},
	tabs: [
		{
			name: "(default)",
			columns: [
				Columns.Status,
				Columns.Artist,
				{name: "Featured Arist", width: "50", property: "featured_artist", linkTo:"/artist/*", filtered: false},
				Columns.Title,
				Columns.Album,
				Columns.Refs,
				Columns.Genre,
				Columns.Tags,
				Columns.Released
			],
			filter: function(filters) {
				let piece = location.pathname.substring("/remix/".length);
				let trackNo = piece.substring(0, piece.indexOf("-"));
				let filterCopy = JSON.parse(JSON.stringify(filters));
				filterCopy.remixcover = {include: [trackNo]};
				return filterCopy
			}
		}
	]

}

let ArtistList = {
	api: "/api/view/artists",
	htmlTitle: "<h1 class='no-margin'>Artists</h1>",
	tabs: [
		{
			name: "(default)",
			columns: [
				Columns.StatusNF,
				Columns.ArtistNF,
				Columns.GenreNF,
				{name: "Tracks", width: "50", property: "tracks"},
				{name: "Latest track", width: "200", property: "title"},
				Columns.ReleasedNF
			]
		}
	]
}

let AlbumList = {
	htmlTitle: "<h1 class='no-margin'>Albums</h1>",
	api: "/api/view/albums",
	tabs: [
		{
			name: "(default)",
			columns: [
				{name: "Album", width: "300", property: "album", linkTo: "/album/*", filtered: false},
				Columns.ArtistNF,
				{name: "Tracks", width: "50", property: "tracks"},
				Columns.GenreNF,
				Columns.ReleasedNF
			]
		}
	]
}


function filterArtist(row)
{
	let artistName = decodeURIComponent(location.pathname.replace("/artist/","").trim());
	let allArtists = (row.artist && row.featured_artist ? row.artist + "\x1E" + row.featured_artist : row.artist + row.featured_artist)
	return allArtists.split("\x1E").filter(x => x != artistName);
}

export {DefaultView, ArtistView, AlbumView, ArtistList, AlbumList, RemixCoverView, GenreView, TagView}