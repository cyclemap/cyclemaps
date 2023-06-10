
import * as main from './main.js';
import * as util from './util.js';

import { MapMouseEvent } from 'maplibre-gl';

export function setupSavePoint() {
	addSavePointListener();
}

function addSavePointListener() {
	main.map.on('click', (event: MapMouseEvent) => {
		if(event.originalEvent.ctrlKey || event.originalEvent.metaKey) {
			fireSavePoint(event);
		}
	});
}

function fireSavePoint(event: MapMouseEvent) {
	if(main.savePoint.url == null) {
		return;
	}

	let category = prompt('please enter a category', 'edited');
	if(category == null) {
		return;
	}

	let title = prompt('please enter a title', '');
	if(title == null) {
		return;
	}
	
	let query = new URLSearchParams();
	query.set('point', util.pointToString(event.lngLat, 4));
	query.set('category', category);
	query.set('title', title);
	let url = `${main.savePoint.url}?${query}`;

	util.ajaxGet(url, (data?: {msg?: string}) => {
		alert(data?.msg ?? 'failure');
	});
}

