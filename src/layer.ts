
import * as directory from './directory.js';
import * as main from './main.js';
import * as util from './util.js';

import { Popup, LayerSpecification, SourceSpecification, MapMouseEvent, MapLayerMouseEvent, MapGeoJSONFeature, MapEvent } from 'maplibre-gl';
import Cookies from 'js-cookie';
import { Feature, FeatureCollection, Geometry } from 'geojson';

const mapboxAccessToken = 'pk.eyJ1IjoiY3ljbGVtYXB1cyIsImEiOiJjanNhbHRlaGMwMGp2NDNqeG80Mzk2cmExIn0.0OBPtvf3KANeaA6QOCk1yw';
const DEFAULT_GEOJSON_TYPE = 'line';

interface LayerMap {
	[key: string]: CyclemapLayerSpecification;
}
export const layerMap: LayerMap = {};



export interface CyclemapLayerSpecification {
	id: string;
	name?: string;
	type: string;
	source: SourceSpecification;
	beforeId?: string;
	onAddLayer?: (layer: CyclemapLayerSpecification) => void;
	active?: boolean;
	layout?: any;
	paint?: any;
}


function getLayers() {
	let cookieLayers = Cookies.get('layers') || null;
	let layers = main.query.has('layers') ? main.query.get('layers') : cookieLayers;
	
	if(layers != null) {
		Cookies.set('layers', layers, main.cookieAttributes);
	}

	return layers;
}

export function setupLayers() {
	let destination = document.getElementsByClassName('maplibregl-ctrl-top-right')[0];
	destination.append(document.getElementById('clearLayers')!);
	destination.append(document.getElementById('layerPicker')!);

	if(mapboxAccessToken != null) {
		main.map.on('style.load', (event: Event) => {
			addSatelliteButton();
		});
		main.map.on('load', (event: Event) => {
			addSatelliteButton();
		});
	}

	document.getElementById('clearLayers')!.onclick = (event: Event) => {
	};
}

function clearLayers() {
	let layerButtons: HTMLCollectionOf<HTMLButtonElement> = document.getElementById('layerPicker')!.getElementsByTagName('button');
	Array.prototype.forEach.call(layerButtons, (input) => {
		const layer = layerMap[input.id];
		if(layer !== undefined) {
			removeLayer(layer);
			input.classList.remove('active');
		}
	});
}

function addSatelliteButton() {
	addLayerButton({
		id: "satellite-raster",
		name: "sat",
		active: false,
		type: "raster",
		source: {type: "raster", tiles: [`https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${mapboxAccessToken}`]},
		layout: {visibility: "visible"},
		beforeId: "satellite-anchor",
	});
}

export function addLayerHelper(id: string, type: string, data: FeatureCollection | Feature | string) {
	addLayerButton({"id": id, "type": type, "source": {"type": "geojson", "data": data}, "active": true});
}

export function checkAddGeoJsonLayer() {
	let geoJsonData: string | null = main.query.get('geo'), type: string = main.query.get('type') ?? DEFAULT_GEOJSON_TYPE;
	if(geoJsonData === null) {
		return;
	}
	main.map.on('style.load', (event: Event) => addLayerHelper('geoJsonData', type, geoJsonData!));
}

export function addLayerButtons(layers: CyclemapLayerSpecification[]) {
	for(let layer of layers) {
		addLayerButton(layer);
	}
}

export function addLayerButton(layer: CyclemapLayerSpecification) {
	let layerPicker: HTMLElement = document.getElementById('layerPicker')!;
	let button: HTMLElement = document.createElement('button');
	let classList: DOMTokenList = button.classList;
	let id: string = layer.id;

	if(document.getElementById(id) != null) {
		return;
	}
	
	layerMap[layer.id] = layer;

	button.setAttribute('id', id);
	button.setAttribute('class', 'maplibregl-ctrl maplibregl-ctrl-group');
	if(layer.active !== undefined && layer.active === true) {
		classList.add('active');
		addLayer(layer);
	}
	let name = layer.name !== undefined ? layer.name : id.substr(0, 4);
	button.appendChild(document.createTextNode(name));
	button.onclick = (event: Event) => {
		let active = !classList.contains('active');
		if(active) {
			classList.add('active');
			addLayer(layer);
		}
		else {
			classList.remove('active');
			removeLayer(layer);
		}
	};
	layerPicker.appendChild(button);
	
	document.getElementById('clearLayers')!.style.visibility = 'visible';
}


function addLayer(layer: CyclemapLayerSpecification) {
	let id = layer.id;
	if(layer.type === 'directory') {
		directory.addDirectory(layer);
		return;
	}
	if(layer.beforeId != null && main.map.getLayer(layer.beforeId) == null) {
		layer.beforeId = undefined;
	}
	
	if(layer.onAddLayer !== undefined) {
		layer.onAddLayer(layer);
	}
	if(main.map.getSource(id) == null) {
		main.map.addSource(id, layer.source);
	}

	main.map.addLayer({
		id,
		type: layer.type,
		source: id,
		layout: layer.layout ?? {},
		paint: layer.paint ?? {},
		...getOptions(layer.type),
	} as (LayerSpecification & {source?: string | SourceSpecification}), layer.beforeId);
	

	if(layer.type === 'symbol') {
		main.map.on('click', id, function(event: MapMouseEvent) {
			let features: MapGeoJSONFeature[] = (event as MapLayerMouseEvent).features!;
			if(features == null || features[0]?.properties?.description == null) {
				return;
			}
			let geometry: Geometry = features[0].geometry;
			let description = features[0].properties.description;

			if(geometry.type == 'Point') {
				new Popup()
					.setLngLat(geometry.coordinates as [number,number])
					.setHTML(description)
					.addTo(main.map);
			}
		});
	}
}

export function removeLayerButtons(layers: CyclemapLayerSpecification[]) {
	for(let layer of layers) {
		removeLayerButton(layer);
	}
}

export function removeLayerButton(layer: CyclemapLayerSpecification) {
	removeLayer(layer);
	let id = layer.id;
	if(main.map.getSource(id) != null) {
		main.map.removeSource(id);
	}
	let button: HTMLElement | null = document.getElementById(id);
	if(button != null) {
		button.remove();
	}
}

export function removeLayer(layer: CyclemapLayerSpecification) {
	if(layer.type === 'directory') {
		directory.removeDirectory(layer);
		return;
	}
	let id = layer.id;
	if(main.map.getLayer(id) == null) {
		return;
	}
	main.map.removeLayer(id);
}

export function checkAddLayers() {
	let layers = getLayers();
	if(layers === null) {
		return;
	}
	util.ajaxGet(layers, (data: {savePointUrl?: string, layers: CyclemapLayerSpecification[]}) => {
		main.savePoint.url = data.savePointUrl;
		main.map.on('style.load', (event: Event) => {
			console.log(`${event.type}: checkAddLayers adding layers`);
			addLayerButtons(data.layers);
		});
		main.map.on('load', (event: Event) => {
			console.log(`${event.type}: checkAddLayers adding layers`);
			addLayerButtons(data.layers);
		});
	});
}

function getOptions(type: string) {
	if(type == 'symbol') {
		return {'layout': {
			'icon-image': ["concat", ["coalesce", ["get", "marker-symbol"], "marker"], "_11"],
			'icon-size': 1.5,
			'text-field': '{title}',
			'icon-allow-overlap': true,
			'text-allow-overlap': true,
			'text-anchor': 'top',
			'text-font': ['Open Sans Regular'],
			'text-max-width': 9,
			'icon-offset': [0, -3],
			'text-offset': [0, .2],
			'text-padding': 2,
			'text-size': 12,
		},
		'paint': {
			'text-color': '#666',
			'text-halo-blur': 0.5,
			'text-halo-color': 'white',
			'text-halo-width': 2,
		}};
	}
	else if(type == 'line') {
		return {'layout': {
			'line-join': 'round',
		},
		'paint': {
			'line-color': '#00d',
			'line-width': {
				'base': 1.2,
				'stops': [[6, 2], [20, 20]],
			},
			'line-opacity': .4,
		}};
	}
	else if(type == 'heatmap') {
		return {
			"maxzoom": 16,
			"minzoom": 9,
			"paint": {
				"heatmap-weight":
					["*",
						["coalesce", ["get", "count"], 1],
						0.00001
					]
				,
				"heatmap-intensity": {
					"stops": [
						[9, 0.1],
						[16, 3000]
					]
				},
				"heatmap-radius": {
					"type": "exponential",
					"stops": [
						[9, 1],
						[16, 20]
					]
				},
				"heatmap-color": [
					"interpolate",
					["linear"],
					["heatmap-density"],
					0, "rgba(0,0,0,0)",
					0.1, "#103",
					0.3, "#926",
					0.4, "#f71",
					0.5, "#ffa"
				],
				"heatmap-opacity": 0.8
			}
		}
	}
	else if(type == 'raster') {
		return;
	}
	console.error('unknown type: ', type);
}

