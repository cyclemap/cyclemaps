
import { LayerControl } from './layer.js';
import * as util from './util.js';

import { MapMouseEvent, IControl, Map } from 'maplibre-gl';

export class SaveControl implements IControl {
	layerControl: LayerControl;
	map: Map | undefined;
	dummyContainer: HTMLElement | undefined;

	constructor(layerControl: LayerControl) {
		this.layerControl = layerControl;
	}

	onAdd(map: Map) {
		this.map = map;
		this.dummyContainer = document.createElement('div');
		this.addSavePointListener();
		return this.dummyContainer;
	}
	
	onRemove(map: Map) {
		this.dummyContainer!.parentNode!.removeChild(this.dummyContainer!);
		this.map = undefined;
	}
	
	addSavePointListener() {
		this.map!.on('click', (event: MapMouseEvent) => {
			if(event.originalEvent.ctrlKey || event.originalEvent.metaKey) {
				this.fireSavePoint(event);
			}
		});
	}

	fireSavePoint(event: MapMouseEvent) {
		if(this.layerControl.savePointUrl === undefined) {
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
		let url = `${this.layerControl.savePointUrl}?${query}`;

		util.ajaxGet(url, (data?: {msg?: string}) => {
			alert(data?.msg ?? 'failure');
		});
	}

}

