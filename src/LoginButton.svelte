<script>
	import CircleSpinner from "./CircleSpinner.svelte";
	export let display = "fixed";

	let signedIn = !!localStorage.role;
	let avatar = localStorage.avatar || "/discord.png";
	let loading = false;

	function clearSession()
	{
		delete sessionStorage.session;
		delete localStorage.role
		delete localStorage.session;
		delete localStorage.avatar;
		signedIn = false;
		avatar = "/discord.png";
	}

	function handleClick(e)
	{
		if(signedIn)
		{
			let signOut = confirm("Do you want to sign out?");

			if(!signOut){
				return;
			}

			clearSession();

			

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
				avatar = data.avatar;

				localStorage.session = data.session;
				signedIn = true;

				let needReload = false;

				for(let key of ["role","session","avatar"])
				{
					if(localStorage[key] != data[key])
					{
						needReload = true;
					}

					localStorage[key] = data[key];
				}

				sessionStorage.session = localStorage.session;

				if(needReload)
				{
					window.location.reload(true);
				}
			}
			else if(data.status == 400)
			{
				clearSession();
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
			localStorage.role = params[1];
			localStorage.avatar = params[2];
			sessionStorage.session = params[0];
			
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
	.login.fixed{
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

	.login.fixed img{
		width: 50px;
		height: 50px;
		border-radius: 25px;
	}

	.login.fixed span
	{
		line-height: 50px;
		color: white;
		display: inline-block;
		vertical-align: top;
		padding: 0px 20px;
	}

	.login.inline img {
		width: 36px;
		height: 36px;
		padding: 2px;
		border-radius: 20px;
		vertical-align: middle;
	}

	.login.inline span {
		vertical-align: middle;
	}

	.login.inline{
		
		display: inline-block;
		height:  40px;
		cursor: pointer;

		vertical-align: middle;
	}

</style>
<div class={'login '+ display} on:click={handleClick} on:contextmenu={handleContextMenu}>
	{#if loading}
		<div style="width: 50px"><CircleSpinner/></div>
	{:else}
		{#if !signedIn}<span>Sign in</span>{/if}<img src={avatar} alt="avatar"/>
	{/if}	
</div>