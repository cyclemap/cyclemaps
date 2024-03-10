
import MapLibreGlDirections, { LoadingIndicatorControl } from "@maplibre/maplibre-gl-directions";
import { ButtonControl } from './button.js';

import { IControl, Map } from 'maplibre-gl';

//TODO: const DURATION_RATIO = 0.92; //discount the duration, because i feel like it


export class RouteControl implements IControl {
	map: Map | undefined;
	directions: MapLibreGlDirections | undefined;
	buttonControl: ButtonControl;
	dummyContainer: HTMLElement | undefined;

	constructor(buttonControl: ButtonControl) {
		this.buttonControl = buttonControl;
	}

	onAdd(map: Map) {
		this.map = map;
		this.dummyContainer = document.createElement('div');

		map.on('load', () => {
			this.directions = new MapLibreGlDirections(map, {
				api: 'https://route.cyclemaps.org/route/v1',
				profile: 'bike',
				requestOptions: {
					alternatives: 'true',
				},
			});

			this.directions.interactive = true;
		});

		return this.dummyContainer;
	}
	
	onRemove(map: Map) {
		this.dummyContainer!.parentNode!.removeChild(this.dummyContainer!);
		this.map = undefined;

		this.directions!.destroy();
		this.directions = undefined;
	}
}

