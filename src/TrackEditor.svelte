<script>
	import IDListInput from "./IDListInput.svelte";
	import RadioSelect from "./RadioSelect.svelte";
</script>

<style>
	.label 
	{
		display: inline-block;
		width: 2in;
		text-align: right;

		line-height: 35px;
	}

	.field .label
	{
		vertical-align: top;
		margin: 4px 0px;
	}

	input {margin: 0px}
</style>

<h1>Add Track</h1>

<div>
	<div class='field'>
		<span class="label">Name:</span>
		<input id='name' type="text" maxlength="255" />
	</div>
	<div class='field'>  
		<span class="label">Artists:</span>
		<IDListInput />
	</div>
	<div class='field'>
		<span class="label">Featured Artists:</span>
		<input type="text" />
	</div>
	<div class='field'>
		<span class="label">How Pony is it?</span>
		<RadioSelect items={["Obviously Pony","Pony","Pony Inspired","Not Pony"]} />
	</div>
	<div class='field'>
		<span class="label">Links:</span>
		<input type="text" maxlength="1000" />
	</div>

</div>

<div><button>Update</button></div>
