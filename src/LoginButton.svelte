<script>
	import CircleSpinner from "./CircleSpinner.svelte";
	let signedIn = !!sessionStorage.role;
	let avatar = sessionStorage.avatar || "/avatar.svg";
	let loading = false;

	function handleClick(e)
	{
		if(signedIn)
		{
			let signOut = confirm("Do you want to sign out?");

			if(!signOut){
				return;
			}

			delete sessionStorage.role
			delete sessionStorage.session;
			delete sessionStorage.avatar;
			delete localStorage.session;
			signedIn = false;
			avatar = "/avatar.svg";

			window.location.reload(true);
		}
		else
		{
			delete localStorage.session;
			window.location = "https://discord.com/api/oauth2/authorize?client_id=949907518019223582&redirect_uri=https%3A%2F%2Fponymusic.wiki%2Flogin&response_type=code&scope=identify"
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
			let request = await fetch("/restoreSession", {
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
				sessionStorage.avatar = data.avatar;
				avatar = data.avatar;
				localStorage.session = data.session;
				signedIn = true;
				window.location.reload(true);
			}
			else if(data.status == 400)
			{
				delete localStorage.session;
				delete sessionStorage.role;
				delete sessionStorage.avatar;
				delete sessionStorage.session;
				signedIn = false;
			}

			loading = false;
		}
	}

	async function getSessionFromURL()
	{
		let query = (window.location.search || "").substring(1);
		if(query.startsWith("session="))
		{
			let params = query.substring("session=".length).split(",")
			localStorage.session = params[0];
			sessionStorage.session = params[0];
			sessionStorage.role = params[1];
			sessionStorage.avatar = params[2];
			avatar = params[2];

			signedIn = true;

			history.replaceState({}, undefined, "/");
			window.location.reload(true);
		}
	}

	getSessionFromURL();
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