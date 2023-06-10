
import * as main from './main.js';
import * as util from './util.js';
import * as layer from './layer.js';

import { LngLat, MapTouchEvent, MapMouseEvent } from 'maplibre-gl';
import { Feature, FeatureCollection } from 'geojson';

const openrouteAccessToken: string = '5b3ce3597851110001cf6248ba1b7964630a48d9841d1336bd6686c7';

let startPoint: LngLat | null = null;

export function setupRoute() {
	addRouteListener();
}


/**
 * long press implementation here is fairly manual
 */
function addRouteListener() {
	main.map.on('contextmenu', fireRoute); //right click
	
	let routeTimeout: any = null;
	let clearRouteTimeout = () => clearTimeout(routeTimeout);

	main.map.on('touchstart', (event: MapTouchEvent) => {
		if(event.originalEvent.touches.length > 1) {
			return;
		}
		routeTimeout = setTimeout(() => {
			window.navigator.vibrate(100);
			setTimeout(() => fireRoute(event), 1);
		}, 500);
	});
	main.map.on('touchend', clearRouteTimeout);
	main.map.on('touchcancel', clearRouteTimeout);
	main.map.on('touchmove', clearRouteTimeout);
	main.map.on('pointerdrag', clearRouteTimeout);
	main.map.on('pointermove', clearRouteTimeout);
	main.map.on('moveend', clearRouteTimeout);
	main.map.on('gesturestart', clearRouteTimeout);
	main.map.on('gesturechange', clearRouteTimeout);
	main.map.on('gestureend', clearRouteTimeout);
}

function fireRoute(event: MapTouchEvent | MapMouseEvent) {
	if(openrouteAccessToken === null) {
		return;
	}
	
	let point = event.lngLat;
	addRoutePoint(point);
}

function addRoutePoint(point: LngLat) {
	if(startPoint === null) {
		removeRouteButton('startPoint');
		removeRouteButton('endPoint');
		removeRouteButton('route');
		
		startPoint = point;
		let pointFeature: Feature = { type: 'Feature', geometry: { type: 'Point', coordinates: [point.lng, point.lat] }, properties: {'marker-symbol': 'marker', title: 'start'} };
		layer.addLayerHelper('startPoint', 'symbol', pointFeature);
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
		layer.addLayerHelper('route', 'line', data);
		let summary = data.features[0]?.properties?.summary;
		let duration = (summary.duration / 3600).toFixed(1);
		let distance = (summary.distance / 1000).toFixed(0);
		let pointFeature: Feature = { type: 'Feature', geometry: { type: 'Point', coordinates: [point.lng, point.lat] }, properties: {'marker-symbol': 'marker', title: `end ${duration}h\n${distance}km`} };
		layer.addLayerHelper('endPoint', 'symbol', pointFeature);
	});
	
	startPoint = null;
}

function removeRouteButton(id: string) {
	let routeButton: HTMLElement | null = document.getElementById(id);
	const routeLayer: layer.CyclemapLayerSpecification = layer.layerMap[id];
	if(routeButton === null || routeLayer === undefined) {
		return;
	}
	layer.removeLayerButton(routeLayer);
	routeButton.classList.remove('active');
}

