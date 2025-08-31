<script>
	import FloatCheckboxMenu from "./FloatCheckboxMenu.svelte";
	import {getMyLists} from "./myLists.js";
	import {onMount, createEventDispatcher} from "svelte";

	export let target = null;
	export let values = [];
	export let track_id = "";

	let options = []

	let dispatch = createEventDispatcher();

	onMount(async function(){

		options = (await getMyLists()).filter(x => !x.star).map(x => {return {text: x.name, value: x.id}});

	});

	async function updatePlaylists(e)
	{
		let response = await (await fetch("/api/setUserLists", {
			method: "PUT",
			headers: {"Content-Type": "text/json"},
			body: JSON.stringify({
				session: sessionStorage.session,
				track_id: track_id,
				lists: values.join(",")
			})
		})).json();

		if(response.status == 200)
			dispatch("close");
	}

</script>

<FloatCheckboxMenu options={options} target={target} on:close={updatePlaylists} bind:values={values} />