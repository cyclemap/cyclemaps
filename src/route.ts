
import MapLibreGlDirections, { LoadingIndicatorControl } from "@maplibre/maplibre-gl-directions";
import { ButtonControl } from './button.js';

import { IControl, Map } from 'maplibre-gl';

const DURATION_RATIO = 0.7; //discount the duration, mapbox cycling speed is crazy-slow
const CYCLEMAPS_MAPBOX_PUBLIC_ACCESS_TOKEN = process.env.CYCLEMAPS_MAPBOX_PUBLIC_ACCESS_TOKEN;

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
				api: 'https://api.mapbox.com/directions/v5/mapbox',
				profile: 'cycling',
				requestOptions: {
					access_token: CYCLEMAPS_MAPBOX_PUBLIC_ACCESS_TOKEN,
				},
			});

			this.directions.on("fetchroutesend", (event) => {
				const summary = event.data?.routes[0];
				const duration = ((summary?.duration as number) / 3600 * DURATION_RATIO).toFixed(1);
				const distance = ((summary?.distance as number) / 1000).toFixed(0);
				console.info(`${duration}h ${distance}km`);
			});

			/*
			this.directions.on("removewaypoint", () => {
				if (this.directions!.waypoints.length < 2) {
					//reset time/distance
				}
			});
			*/

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

