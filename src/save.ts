
import { ButtonControl } from './button';
import { PointUtil } from './pointUtil';
import { FetchUtil } from './fetchUtil';

import { MapMouseEvent, IControl, Map } from 'maplibre-gl';

export class SaveControl implements IControl {
	private buttonControl: ButtonControl;
	private map: Map | undefined;
	private dummyContainer: HTMLElement | undefined;

	public constructor(buttonControl: ButtonControl) {
		this.buttonControl = buttonControl;
	}

	public onAdd(map: Map) {
		this.map = map;
		this.dummyContainer = document.createElement('div');
		this.addSavePointListener();
		return this.dummyContainer;
	}
	
	public onRemove(map: Map) {
		this.dummyContainer!.parentNode!.removeChild(this.dummyContainer!);
		this.map = undefined;
	}
	
	private addSavePointListener() {
		this.map!.on('click', (event: MapMouseEvent) => {
			if(event.originalEvent.ctrlKey || event.originalEvent.metaKey) {
				this.fireSavePoint(event)
					.then(() => {});
			}
		});
	}

	private async fireSavePoint(event: MapMouseEvent) {
		if(this.buttonControl.savePointUrl === undefined) {
			return;
		}

		const category = prompt('please enter a category', 'edited');
		if(category == null) {
			return;
		}

		const title = prompt('please enter a title', '');
		if(title == null) {
			return;
		}
		
		const query = new URLSearchParams();
		query.set('point', PointUtil.pointToString(event.lngLat, 4));
		query.set('category', category);
		query.set('title', title);
		const url = `${this.buttonControl.savePointUrl}?${query}`;

		const data: {msg?: string} = await FetchUtil.fetchAndParse(url);
		alert(data?.msg ?? 'failure');
	}

}

