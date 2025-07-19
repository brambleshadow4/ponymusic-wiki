<script>
	export let caption = "(caption)";
	export let options = [];

	let open = false;
	var optionsButton = null;
	var optionsDiv = null;

	function handleClick()
	{
		open = true;
	}

	function optionClick(opt)
	{
		open = false;
		opt.handler();
	}

	function blurHandler()
	{
		setTimeout(() => {open = false}, 100);
	}


</script>
<style>
	.button-options {
		border: solid 1px #AAA;
		background-color: #F4F4F4;
		position: absolute;
	}
	.option {
		padding: 3px;
		cursor: pointer;

	}
	.option:hover {
		background-color: #d0d0d0;
	}
	.option + .option {
		border-top: solid 1px #AAA;
	}
</style>

<button bind:this={optionsButton} on:blur={blurHandler} on:click={handleClick}>{caption}</button>
{#if open}
	<div bind:this={optionsDiv} class='button-options'>
		{#each options as option}
			<div class='option' on:click={() => optionClick(option)}>{option.caption}</div>
		{/each}
	</div>
{/if}