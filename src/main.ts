
import * as layer from './layer.js';
import * as save from './save.js';
import * as route from './route.js';
import * as rain from './rain.js';
import * as util from './util.js';
import * as browserImport from './browserImport.js';

import Cookies from 'js-cookie';
import VectorTextProtocol from 'maplibre-gl-vector-text-protocol';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl, { LngLat, Map, MapMouseEvent, NavigationControl, ScaleControl, GeolocateControl } from 'maplibre-gl';

const highZoom = 12;

export const query = new URLSearchParams(window.location.search);
export const cookieAttributes: Cookies.CookieAttributes = { expires: 182 };

export const map: Map = setupMap();

export interface SavePoint {
	url?: string;
};
export let savePoint: SavePoint = {};

setup();

function setup() {
	addMoveListener();
	addClickListeners();
	layer.checkAddGeoJsonLayer();
	layer.checkAddLayers();
	layer.setupLayers();
	save.setupSavePoint();
	route.setupRoute();
	rain.setupRain();
	browserImport.setupImports();
}

function getStyle() {
	let styleRoot = '';
	let cookieStyle = Cookies.get('style') || null;
	let style = query.has('style') ? `style-${query.get('style')}.json` : cookieStyle;

	
	if(style != null) {
		Cookies.set('style', style, cookieAttributes);
	}

	return styleRoot + (style != null ? style : 'style.json');
}

function setupMap() {
	VectorTextProtocol.addProtocols(maplibregl);
	//setRTLTextPlugin('mapbox-gl-rtl-text.js');
	const defaultLatitude = 40;
	const defaultLongitude = -96;
	const defaultZoom = 5;

	let latitude: number = +(Cookies.get('latitude') || defaultLatitude);
	let longitude: number = +(Cookies.get('longitude') || defaultLongitude);
	let zoom: number = +(Cookies.get('zoom') || defaultZoom);

	let map = new Map({
		container: 'map',
		style: getStyle(),
		center: new LngLat(longitude, latitude),
		zoom: zoom,
		hash: true,
		failIfMajorPerformanceCaveat: true,
		dragRotate: false
	});
	map.addControl(new NavigationControl());
	map.addControl(new ScaleControl({}));
	map.addControl(new GeolocateControl({
		positionOptions: {enableHighAccuracy: true},
		trackUserLocation: true
	}));
	map.scrollZoom.setWheelZoomRate(4 / 450); //default is 1 / 450
	return map;
}

function addMoveListener() {
	map.on('moveend', checkMove);
	checkMove();
	function checkMove() {
		if(map.isMoving()) {
			return;
		}
		let latitude: number = map.getCenter().lat, longitude: number = map.getCenter().lng, zoom: number = map.getZoom();

		Cookies.set('latitude', latitude.toString(), cookieAttributes);
		Cookies.set('longitude', longitude.toString(), cookieAttributes);
		Cookies.set('zoom', zoom.toString(), cookieAttributes);
	}
	
	map.on('zoom', checkZoom);
	checkZoom();
	function checkZoom() {
		let highZoomEnabled = map.getZoom() >= highZoom;
		document.getElementById('footLegend')!.style.opacity = (highZoomEnabled ? 1 : 0).toString();
	}
}

function addClickListeners() {
	map.on('mouseup', (event: MapMouseEvent) => {
		if(event.originalEvent.shiftKey) {
			alert(`point:  ${util.pointToString(event.lngLat, 4)}`);
		}
	});
}


export function getHeatmapPoint() {
	var zoom = map.getZoom() + 1;
	return `${zoom.toFixed(1)}/${util.reversedPointToString(map.getCenter()).replace(",","/")}`;
}

export function getOsmPoint() {
	var zoom = map.getZoom() + 1;
	return `${zoom.toFixed(0)}/${util.pointToString(map.getCenter()).replace(",","/")}`;
}

export function getGPoint() {
	var zoom = map.getZoom() + 1;
	return `${util.pointToString(map.getCenter())},${zoom.toFixed(0)}`;
}

