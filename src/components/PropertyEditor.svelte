<script>
	export let property = ""
	export let display = "(missing display)";
	export let data = {properties: []}
	export let allowMultiple = false;

	let container = null;

	function setupVals(data)
	{
		let newData = data.properties.filter(x => x[0] == property).map(x => x[1]);

		if(newData.length == 0 || newData[newData.lenght-1] != "")
			newData.push("")
		return newData
	}

	$: boundValues = setupVals(data)

	function updateModel()
	{
		let inputs = container.getElementsByTagName('input');

		let newValues = [];

		for(let i = 0; i< inputs.length; i++)
		{
			newValues.push(inputs[i].value)
		}

		newValues = newValues.filter(x => x != "").map(x => [property, x])

		data.properties = data.properties.filter(x => x[0] != property).concat(newValues);

	}


</script>

<style>
	.field {
		display: flex;
	}

	.label {
		display: inline-block;
		width: 1.5in;
		height: 35px;
		line-height: 35px;

		text-align: right;
		margin-right: 10px;

	}
	.inputs {
		flex-grow: 1;
		margin-right: 20px;
	}

	input {
		width: 100%;
	}
</style>

<div class='field'>
	<div class="label"><span>{display}:</span></div>
	<div class='inputs' bind:this={container} >
		{#if allowMultiple}
			{#each boundValues as val}
				<div><input type="text" maxlength="255" value={val} on:input={updateModel}/></div>
			{/each}
		{:else}
			<input type="text" maxlength="255" value={boundValues[0]} on:input={updateModel} />
		{/if}
	</div>
	
</div>