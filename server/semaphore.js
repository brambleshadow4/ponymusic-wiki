function Sempahore(initialCount)
{
	let count = initialCount;
	let promiseQueue = []
	this.promiseQueue = promiseQueue;

	this.whenResourceIsAvailable = async function(handler)
	{
		while(count <= 0)
		{
			await waitForCountToIncrease();
		};

		count--;

		var returnVal;
		try
		{
			returnVal = await handler();
		}
		finally
		{
			count++;
		}

		while(this.promiseQueue.length)
		{
			this.promiseQueue.shift()();
		}

		return returnVal;
	}

	function waitForCountToIncrease()
	{
		return new Promise((resolve, reject) => {
			promiseQueue.push(resolve);
		});
	}
}

exports.Semaphore = Sempahore;