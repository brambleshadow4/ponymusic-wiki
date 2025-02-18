import loader from "./loaderLib.js";


var locked = false;
var lastGeneratedDBFile = ""


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

		new Promise(async function(){
			
			lastGeneratedDBFile = date;
			console.log("EXPORTING DATA");

			await Promise.all([
				loader.doExcelExport(), 
				loader.doExport()]
			);

			locked = false;
			return;

		});


		return false

		
	}

	return true;

}

export {prepareExport}



