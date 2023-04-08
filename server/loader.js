
const readline = require('readline');
const pro = require('process');

main();

var rl;

async function main()
{
	rl = readline.createInterface({ input: pro.stdin, output: pro.stdout });
	
	console.clear();
	console.log("+------Ponymusic.wiki LOADER------+");
	console.log("|  1. DUMP                        |")         
	console.log("|  2. LOAD                        |");
	console.log("|  3. PULL FROM WIKI              |");
	console.log("+---------------------------------+")

	let x = await read(">");

	if(x == "1"){
		await doExport();
	}
	
	if(x == "2"){
		let filename = await read("File: ");
		await doLoad()filename;
	}

	if(x == "3"){
		await doPull();
	}

	process.exit();
}


async function read(prompt)
{
	prompt = prompt || "";
	return new Promise((accept, reject )=>{
		rl.question(prompt, accept);
	})
}

