<script>
	export let caption = "(caption)";

	let options = [
		"Not Pony",
		"Other"
	]

	let open = false;

	function handleClick()
	{
		open = true;
	}
</script>
<style>
	.button-options {
		border: solid 1px #AAA;
		background-color: #F4F4F4;
		
	}
	.option {
		padding: 3px;

	}
	.option:hover {
		background-color: #d0d0d0;
	}
	.option + .option {
		border-top: solid 1px #AAA;
		
	}
</style>

<button on:click={handleClick}>{caption}</button>
{#if open}
	<div class='button-options'>
		{#each options as option}
			<div class='option'>{option}</div>
		{/each}
	</div>
{/if}