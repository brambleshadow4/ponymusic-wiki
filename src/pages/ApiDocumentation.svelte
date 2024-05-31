
<h1>API Documentation</h1>

<p>This page is a work in progress. Reach out to brambleshadow4 if you are hoping to develop clients or scripts which need to use these endpoints</p>

<h2>JSON Types</h2>

<h3 id="track_format">Track Format</h3>
<pre>
{`{
    "id": number, // The ID of the track. Unique
    "title": string, // The name of the track. Should NOT include the genre, artist, or album,
                        but should include featured artist/remix info  like (JTH remix) or (feat. Naami)
    "release_date": string, // Earliest known release date of the track, should be in "YYYY-MM-DD" format
    "tags": Tag[]
}`}
</pre>

<h3>Tag Format</h3>
<pre>{`{
    property: string,
    value: string,
    number?: integer
}`}</pre>

<p>Here are some examples of tags</p>

<pre>{`{property: "hyperlink", value: "https://www.youtube.com/watch?v=OcH9RTQv2C4"}
{property: "artist", value: "Vylet Pony"}
{property: "tag", value: "P@D"}
{property: "featured artist", value: "Namii"}
{property: "album", value: "Quadragennial", number: 7}
{property: "genre", value: "Metal"}
{property: "pl", value: "1"} // pony level enum, its value should be 0-No references, 1-Subtle References, 2-Obvious references`}</pre>

<h3>GET /api/view/artists</h3>
<p>TODO</p>
<h3>GET /api/view/albums</h3>
<p>TODO</p>
<h3>GET /api/view/tracks</h3>

<p>Parameters are all sent in the url as query parameters, e.g. <code>artist=brambleshadow4&genre=Happy Hardcore</code>. The value of each parameter should be encoded with encodeURIComponent. Multiple values can be sent for each parameter by using a comma delmited list.
</p>
<p>TODO</p>

<h3>GET /api/track/&lt;ID&gt;</h3>

<p>Gets a track record for &lt;ID&gt;</p>

<h3>GET /api/history</h3>
<p>TODO</p>
<h3>GET /api/search</h3>

<p>TODO</p>

<h3>POST /api/track</h3>

<p>Creates a track record or edits an existing track record</p>

<p><strong>Any client which isues POST requests to /api/track MUST first send a POST request to /api/getTrackWarnings. /api/getTrackWarnings checks for duplicate URLs, duplicate track titles, invalid artist names and more. If /api/getTrackWarnings returns any warnings, they MUST be reviewed by a person prior to issuing the POST request to /api/track. </strong></p>

<p>Payload is a JSON object which extends the <a href="#track_format">Track</a> type</p>

<pre>
{`{
    "id": "new" | <track-id>,
    "session": string, // secret session ID.
    ...Track object 
}`}
</pre>

<h3>POST /api/getTrackWarnings</h3>

<p>Payload is the <a href="#track_format">Track</a> type</p>

<h3>POST /api/setTagMetadata</h3>
<p>TODO</p>
<h3>POST /api/checkURLs</h3>
<p>TODO</p>
<h3>POST /api/setUserFlag</h3>
<p>TODO</p>

<h3>DELETE /api/track</h3>
<style>
	h1, h2, h3 {
		margin: 0px;
	}
	body {
		background-color: red;
	}


</style>