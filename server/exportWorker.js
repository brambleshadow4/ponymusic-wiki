import loader from "./loaderLib.js";
import {
	Worker,
	isMainThread,
	parentPort,
} from "node:worker_threads";


var locked = false;
var progress = "0/11";
var lastGeneratedDBFile = "";

if(!isMainThread)
{
	new Promise(async function(){
		
		let returnDate = new Date().toISOString().substring(0,10);
		console.log("EXPORTING DATA");

		let statusObj = {
			parent: parentPort, 
			progressCount: 0, 
			total: 11,
			progress: function(){
				this.progressCount++;
				this.parent.postMessage("PROGRESS " + this.progressCount + "/" + this.total)
			}
		}

		await loader.makeCopy(statusObj);
		await loader.doExport(statusObj);
		//await loader.doExcelExport();
		//await loader.doRdfExport();

		parentPort.postMessage("DATE " + returnDate);
		return;
	});
}

function getProgress()
{
	return progress;
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

			if(data.startsWith("DATE "))
			{
				locked = false;
				lastGeneratedDBFile = data;
			}
			if(data.startsWith("PROGRESS "))
			{
				progress = data.substring("PROGRESS ".length);
			}
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

export {prepareExport, getProgress}