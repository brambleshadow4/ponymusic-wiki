import loader from "./loaderLib.js";
import {
	Worker,
	isMainThread,
	parentPort
} from "node:worker_threads";


var locked = false;
var lastGeneratedDBFile = "";

if(!isMainThread)
{
	new Promise(async function(){
		
		let returnDate = new Date().toISOString().substring(0,10);
		console.log("EXPORTING DATA");

		await loader.makeCopy();
		await loader.doExport();
		//await loader.doExcelExport();
		//await loader.doRdfExport();

		parentPort.postMessage(returnDate);
		return;
	});
}

function prepareExport()
{
	if(locked)
	{
		return false;
	}

	let date = new Date().toISOString().substring(0,10);

	if(lastGeneratedDBFile < date)
	{
		locked = true;

		let worker = new Worker("./server/exportWorker.js");

		worker.on("message", function(data){
			locked = false;
			lastGeneratedDBFile = data;
		});
		worker.on("error",function(e){
			console.log(e)
		});
		worker.on("exit",function(){
			console.log("worker exited")
		});

		return false
	}

	return true;
}

export {prepareExport}