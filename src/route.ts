
import MapLibreGlDirections, { LoadingIndicatorControl } from "@maplibre/maplibre-gl-directions";


import { IControl, Map } from 'maplibre-gl';

const DURATION_RATIO = 0.7; //discount the duration, mapbox cycling speed is crazy-slow
const CYCLEMAPS_MAPBOX_PUBLIC_ACCESS_TOKEN = process.env.CYCLEMAPS_MAPBOX_PUBLIC_ACCESS_TOKEN;

export class RouteControl implements IControl {
	map: Map | undefined;
	directions: MapLibreGlDirections | undefined;
	dummyContainer: HTMLElement | undefined;

	constructor() {
	}

	onAdd(map: Map) {
		this.map = map;
		this.dummyContainer = document.createElement('div');
		
		const directions = new MapLibreGlDirections(this.map!, {
			api: 'https://api.mapbox.com/directions/v5',
			makePostRequest: true,
			profile: 'mapbox/cycling',
			requestOptions: {
				access_token: CYCLEMAPS_MAPBOX_PUBLIC_ACCESS_TOKEN,
				geometries: "polyline6",
			},
		});
		this.directions = directions;

		directions.on("addwaypoint", (event) => {
			console.info(`### on addwaypoint`);
		});
		directions.on("fetchroutesend", (event) => {
			const summary = event.data?.routes[0];
			const duration = ((summary?.duration as number) / 3600 * DURATION_RATIO).toFixed(1);
			const distance = ((summary?.distance as number) / 1000).toFixed(0);
			console.info(`${duration}h ${distance}km`);
		});

		directions.interactive = true;

		/*
		directions.on("removewaypoint", () => {
			if (this.directions!.waypoints.length < 2) {
				//reset time/distance
			}
		});
		*/
		return this.dummyContainer;
	}
	
	onRemove(map: Map) {
		this.dummyContainer!.parentNode!.removeChild(this.dummyContainer!);
		this.map = undefined;

		this.directions!.destroy();
		this.directions = undefined;
	}
}

