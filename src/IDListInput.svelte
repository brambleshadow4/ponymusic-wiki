<script>
	import IDInput from "./IDInput.svelte";

	let rows = [];
	let inputValue = [-1,""];

	let text = "asd";

	function addRow(e)
	{
		if(rows.filter(x => x[0] == e.detail[0]).length == 0)
		{
			rows.push(e.detail);
			rows = rows;
		}

		inputValue = [-1,""];

		console.log(e);
		console.log(rows);

		text = rows.map(x => x.text).join(", ");
	}

	function removeRow(row)
	{
		return function()
		{
			let i = rows.indexOf(row);
			rows.splice(i, 1);
			rows = rows;
		}
	}

</script>
<style>
	.container {
		display: inline-block;
	}

	td {
		line-height: 30px;
	}

	.remove-button{cursor: pointer;}
</style>


<div class='container'>
	
	<table>
		{#each rows as row}
			<tr>
				<td>{row[1]}</td><td class="remove-button" on:click={removeRow(row)}>❌</td>
			</tr>
		{/each}
	</table>
	<IDInput on:change={addRow} value={inputValue} />
</div>
