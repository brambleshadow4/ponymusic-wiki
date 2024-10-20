import readline from 'readline';
import pro from 'process';
import loader from "./loaderLib.js";

main();

var rl;

async function main()
{
	rl = readline.createInterface({ input: pro.stdin, output: pro.stdout });
	
	console.clear();
	console.log("+------Ponymusic.wiki LOADER------+");
	console.log("|  1. EXPORT SQL                  |")   
	console.log("|  2. EXPORT EXCEL FILE           |")      
	console.log("|  3. LOAD SQL                    |");
	console.log("|  4. PULL FROM WIKI              |");
	console.log("+---------------------------------+")

	let x = await read(">");

	if(x == "1"){
		console.log("DUMPING to fullExport.sql");
		await loader.doExport();
	}
	
	if(x == "3"){
		let filename = await read("File: ");
		await loader.doLoad(filename);
	}

	if(x == "2"){
		await loader.doExcelExport();
	}

	if(x == "4"){
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

