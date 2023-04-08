const readline = require('readline');
const pro = require('process');
const loader = require("./loaderLib.js");

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
		console.log("DUMPING to fullExport.sql");
		await loader.doExport();
	}
	
	if(x == "2"){
		let filename = await read("File: ");
		await loader.doLoad(filename);
	}

	if(x == "3"){
		await loader.doPull();
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

