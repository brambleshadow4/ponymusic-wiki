<script>
	import CircleSpinner from "./CircleSpinner.svelte";
	let signedIn = !!sessionStorage.role;
	let avatar = "/avatar.svg";
	let loading = false;

	function handleClick(e)
	{
		if(signedIn)
		{
			delete sessionStorage.role
			delete sessionStorage.session;
			delete localStorage.session;
			signedIn = false;
			avatar = "/avatar.svg";
		}
	}

	function handleContextMenu(e)
	{
		e.preventDefault();
		if(!signedIn)
		{
			let x = prompt("SessionID")
			if(x)
			{
				localStorage.session = x;
				restoreSession();
			}
		}
	}
	
	async function restoreSession()
	{
		if(localStorage.session && !sessionStorage.session)
		{
			loading = true;
			let request = await fetch("/api/login", {
				method: "POST",
				headers: {"Content-Type": "text/json"},
				body: JSON.stringify({
						session: localStorage.session
				})
			});

			let data = await request.json();

			if(data.status == 200)
			{
				sessionStorage.role = data.role;
				sessionStorage.session = data.session;
				localStorage.session = data.session;
				signedIn = true;
			}

			loading = false;
		}
	}

	restoreSession();

</script>
<style>
	.login{
		position: fixed;
		top: 20px;
		right: 20px;

		z-index: 1;

		background-color:  #101010;
		border-radius: 25px;
		display: inline-block;
		height:  50px;
		cursor: pointer;
	}

	.login img{
		width: 50px;
		height: 50px;
		border-radius: 25px;
	}

	.login span
	{
		line-height: 50px;
		color: white;
		display: inline-block;
		vertical-align: top;
		padding: 0px 20px;
	}
</style>
<div class='login' on:click={handleClick} on:contextmenu={handleContextMenu}>
	{#if loading}
		<div style="width: 50px"><CircleSpinner/></div>
	{:else}
		{#if !signedIn}<span>Sign in</span>{/if}<img src={avatar} alt="avatar"/>
	{/if}	
</div>