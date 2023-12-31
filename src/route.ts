
import * as util from './util.js';
import { ButtonControl } from './button.js';

import { IControl, LngLat, Map, MapTouchEvent, MapMouseEvent } from 'maplibre-gl';
import { Feature, FeatureCollection } from 'geojson';

const openrouteAccessToken: string = '5b3ce3597851110001cf6248ba1b7964630a48d9841d1336bd6686c7';
const DURATION_RATIO = 0.92; //discount the duration, because i feel like it

let startPoint: LngLat | null = null;

export class RouteControl implements IControl {
	map: Map | undefined;
	buttonControl: ButtonControl;
	dummyContainer: HTMLElement | undefined;

	constructor(buttonControl: ButtonControl) {
		this.buttonControl = buttonControl;
	}

	onAdd(map: Map) {
		this.map = map;
		this.dummyContainer = document.createElement('div');
		this.addRouteListener();
		return this.dummyContainer;
	}
	
	onRemove(map: Map) {
		this.dummyContainer!.parentNode!.removeChild(this.dummyContainer!);
		this.map = undefined;
	}
	
	/**
	 * long press implementation here is fairly manual
	 */
	addRouteListener() {
		this.map!.on('contextmenu', event => this.fireRoute(event)); //right click
		
		let routeTimeout: any = null;
		let clearRouteTimeout = () => clearTimeout(routeTimeout);

		this.map!.on('touchstart', (event: MapTouchEvent) => {
			if(event.originalEvent.touches.length > 1) {
				return;
			}
			routeTimeout = setTimeout(() => {
				window.navigator.vibrate(100);
				setTimeout(() => this.fireRoute(event), 1);
			}, 500);
		});
		this.map!.on('touchend', clearRouteTimeout);
		this.map!.on('touchcancel', clearRouteTimeout);
		this.map!.on('touchmove', clearRouteTimeout);
		this.map!.on('pointerdrag', clearRouteTimeout);
		this.map!.on('pointermove', clearRouteTimeout);
		this.map!.on('moveend', clearRouteTimeout);
		this.map!.on('gesturestart', clearRouteTimeout);
		this.map!.on('gesturechange', clearRouteTimeout);
		this.map!.on('gestureend', clearRouteTimeout);
	}

	fireRoute(event: MapTouchEvent | MapMouseEvent) {
		if(openrouteAccessToken === null) {
			return;
		}
		
		let point = event.lngLat;
		this.addRoutePoint(point);
	}

	addRoutePoint(point: LngLat) {
		if(startPoint === null) {
			this.buttonControl.removeLayerButtonById('startPoint');
			this.buttonControl.removeLayerButtonById('endPoint');
			this.buttonControl.removeLayerButtonById('route');
			
			startPoint = point;
			let pointFeature: Feature = { type: 'Feature', geometry: { type: 'Point', coordinates: [point.lng, point.lat] }, properties: {'marker-symbol': 'marker', title: 'start'} };
			this.buttonControl.addLayerHelper('startPoint', 'symbol', pointFeature);
			return;
		}

		let endPoint = point;

		let query = new URLSearchParams();
		query.set('api_key', openrouteAccessToken);
		query.set('start', util.reversedPointToString(startPoint, 6));
		query.set('end', util.reversedPointToString(endPoint, 6));

		let url = `https://api.openrouteservice.org/v2/directions/cycling-regular?${query}`;

		util.ajaxGet(url, (data: FeatureCollection) => {
			//sending in url directly here doesn't work because of somesuch header (Accept: application/json) made the server mad
			this.buttonControl.addLayerHelper('route', 'line', data);
			let summary = data.features[0]?.properties?.summary;
			let duration = (summary.duration / 3600 * DURATION_RATIO).toFixed(1);
			let distance = (summary.distance / 1000).toFixed(0);
			let pointFeature: Feature = { type: 'Feature', geometry: { type: 'Point', coordinates: [point.lng, point.lat] }, properties: {'marker-symbol': 'marker', title: `end ${duration}h\n${distance}km`} };
			this.buttonControl.addLayerHelper('endPoint', 'symbol', pointFeature);
		});
		
		startPoint = null;
	}
}
