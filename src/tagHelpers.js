export function tagComp(tag1, tag2){

	if(tag1.property == tag2.property){
		if (tag1.value > tag2.value) return 1;
		if (tag2.value > tag1.value) return -1;

		return 0;  
	}

	let k = propertyOrder(tag1.property) - propertyOrder(tag2.property);
	if(k != 0) return k;

	if (tag1.property > tag2.property) return 1;
	if (tag2.property > tag1.property) return -1;
	return 0;
}

function propertyOrder(prop){
	switch(prop){
		case "hyperlink": return 0;
		case "artist": return 1;
		case "featured artist": return 2;
		case "pl": return 3;
		default: return 4;
	}
}