


<h2>Bookmarklet</h2>

<textarea bind:this={compiled}>
	

</textarea>


<h2>Source code</h2>
<textarea class='expand' bind:this={source}>{
`url = encodeURIComponent(window.location);
title = encodeURIComponent(document.getElementsByClassName('title ytd-video-primary-info-renderer')[0].children[0].innerHTML);
date = encodeURIComponent(document.getElementById('info-strings').getElementsByTagName('yt-formatted-string')[0].innerHTML);
artist = encodeURIComponent(document.getElementById("text-container").getElementsByTagName('a')[0].innerHTML);
x = window.open(\`http://localhost:8000/track/new?title=\${title}&date=\${date}&artist=\${artist}&url=\${url}\`,"_blank");`
}</textarea>

<script>
	import { onMount } from 'svelte';

	let compiled, source;


	function mount(){

		compiled.value = "javascript:" + source.value.replace(/\n|\t/g, "");
	}

	onMount(mount);

	

</script>

<style>
	.expand{
		height: 50%;
	}
</style>