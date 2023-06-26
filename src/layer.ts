
import { MainControl } from './main.js';
import * as util from './util.js';

import { IControl, Popup, LayerSpecification, SourceSpecification, Map, MapMouseEvent, MapLayerMouseEvent, MapGeoJSONFeature, MapEvent } from 'maplibre-gl';
import { Feature, FeatureCollection, Geometry } from 'geojson';

const mapboxAccessToken = 'pk.eyJ1IjoiY3ljbGVtYXB1cyIsImEiOiJjanNhbHRlaGMwMGp2NDNqeG80Mzk2cmExIn0.0OBPtvf3KANeaA6QOCk1yw';
const DEFAULT_GEOJSON_TYPE = 'line';

interface LayerMap {
	[key: string]: CyclemapLayerSpecification;
}



export interface CyclemapLayerSpecification {
	id: string;
	name?: string;
	type: string;
	source: SourceSpecification;
	beforeId?: string;
	onAddLayer?: (layer: CyclemapLayerSpecification) => void;
	onRemoveLayer?: (layer: CyclemapLayerSpecification) => void;
	active?: boolean;
	layout?: any;
	paint?: any;
}

export class LayerControl implements IControl {
	mainControl: MainControl;
	map: Map | undefined;
	container: HTMLElement | undefined;
	layerMap: LayerMap = {};
	savePointUrl: string | undefined;

	constructor(mainControl: MainControl) {
		this.mainControl = mainControl;
	}

	onAdd(map: Map) {
		this.map = map;
		//this.container = DOM.create('div', 'maplibregl-ctrl maplibregl-ctrl-group');
		this.container = document.createElement('div');
		this.container.className = 'maplibregl-ctrl';
		this.checkAddGeoJsonLayer();
		this.checkAddLayers();
		this.setupLayers();
		return this.container;
	}
	
	onRemove(map: Map) {
		this.container!.parentNode!.removeChild(this.container!);
		this.map = undefined;
	}
	
	checkAddGeoJsonLayer() {
		let geoJsonData: string | null = this.mainControl.query.get('geo'), type: string = this.mainControl.query.get('type') ?? DEFAULT_GEOJSON_TYPE;
		if(geoJsonData === null) {
			return;
		}
		this.map!.on('style.load', (event: Event) => this.addLayerHelper('geoJsonData', type, geoJsonData!));
	}

	checkAddLayers() {
		let layers = this.mainControl.getLayersQuery();
		if(layers === null) {
			return;
		}
		util.ajaxGet(layers, (data: {savePointUrl?: string, layers: CyclemapLayerSpecification[]}) => {
			this.savePointUrl = data.savePointUrl;
			this.map!.on('style.load', (event: Event) => {
				console.log(`${event.type}: checkAddLayers adding layers`);
				this.addLayerButtons(data.layers);
			});
			this.map!.on('load', (event: Event) => {
				console.log(`${event.type}: checkAddLayers adding layers`);
				this.addLayerButtons(data.layers);
			});
		});
	}

	setupLayers() {
		let destination = document.getElementsByClassName('maplibregl-ctrl-top-right')[0];
		destination.append(document.getElementById('clearLayers')!);
		destination.append(document.getElementById('layerPicker')!);

		if(mapboxAccessToken != null) {
			this.map!.on('style.load', (event: Event) => {
				this.addSatelliteButton();
			});
			this.map!.on('load', (event: Event) => {
				this.addSatelliteButton();
			});
		}

		document.getElementById('clearLayers')!.onclick = this.clearLayers;
	}

	addLayerButtons(layers: CyclemapLayerSpecification[]) {
		for(let layer of layers) {
			this.addLayerButton(layer);
		}
	}
	
	removeLayerButtons(layers: CyclemapLayerSpecification[]) {
		for(let layer of layers) {
			this.removeLayerButton(layer);
		}
	}

	addDirectory(directory: CyclemapLayerSpecification) {
		this.addLayerButtons(directory.source as any);
	}

	removeDirectory(directory: CyclemapLayerSpecification) {
		this.removeLayerButtons(directory.source as any);
	}

	clearLayers() {
		let layerButtons: HTMLCollectionOf<HTMLButtonElement> = document.getElementById('layerPicker')!.getElementsByTagName('button');
		Array.prototype.forEach.call(layerButtons, (input) => {
			const layer = this.layerMap[input.id];
			if(layer !== undefined) {
				this.removeLayer(layer);
				input.classList.remove('active');
			}
		});
	}

	addSatelliteButton() {
		this.addLayerButton({
			id: "satellite-raster",
			name: "sat",
			active: false,
			type: "raster",
			source: {type: "raster", tiles: [`https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${mapboxAccessToken}`]},
			layout: {visibility: "visible"},
			beforeId: "satellite-anchor",
		});
	}

	addLayerHelper(id: string, type: string, data: FeatureCollection | Feature | string) {
		this.addLayerButton({"id": id, "type": type, "source": {"type": "geojson", "data": data}, "active": true});
	}

	addLayerButton(layer: CyclemapLayerSpecification) {
		let layerPicker: HTMLElement = document.getElementById('layerPicker')!;
		let button: HTMLElement = document.createElement('button');
		let classList: DOMTokenList = button.classList;
		let id: string = layer.id;

		if(document.getElementById(id) != null) {
			return;
		}
		
		this.layerMap[layer.id] = layer;

		button.setAttribute('id', id);
		button.setAttribute('class', 'maplibregl-ctrl maplibregl-ctrl-group');
		if(layer.active !== undefined && layer.active === true) {
			classList.add('active');
			this.addLayer(layer);
		}
		let name = layer.name !== undefined ? layer.name : id.substr(0, 4);
		button.appendChild(document.createTextNode(name));
		button.onclick = (event: Event) => {
			let active = !classList.contains('active');
			if(active) {
				classList.add('active');
				this.addLayer(layer);
			}
			else {
				classList.remove('active');
				this.removeLayer(layer);
			}
		};
		layerPicker.appendChild(button);
		
		document.getElementById('clearLayers')!.style.visibility = 'visible';
	}

	addLayer(layer: CyclemapLayerSpecification) {
		let id = layer.id;
		if(layer.type === 'directory') {
			this.addDirectory(layer);
			return;
		}
		if(layer.beforeId != null && this.map!.getLayer(layer.beforeId) == null) {
			layer.beforeId = undefined;
		}
		
		if(layer.onAddLayer !== undefined) {
			layer.onAddLayer(layer);
		}
		if(this.map!.getSource(id) == null) {
			this.map!.addSource(id, layer.source);
		}

		this.map!.addLayer({
			id,
			type: layer.type,
			source: id,
			layout: layer.layout ?? {},
			paint: layer.paint ?? {},
			...this.getOptions(layer.type),
		} as (LayerSpecification & {source?: string | SourceSpecification}), layer.beforeId);
		

		if(layer.type === 'symbol') {
			const map = this.map!;
			this.map!.on('click', id, (event: MapMouseEvent) => {
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
						.addTo(map);
				}
			});
		}
	}

	removeLayerButton(layer: CyclemapLayerSpecification) {
		this.removeLayer(layer);
		let id = layer.id;
		if(this.map!.getSource(id) != null) {
			this.map!.removeSource(id);
		}
		let button: HTMLElement | null = document.getElementById(id);
		if(button != null) {
			button.remove();
		}
	}

	removeLayer(layer: CyclemapLayerSpecification) {
		if(layer.type === 'directory') {
			this.removeDirectory(layer);
			return;
		}
		let id = layer.id;
		if(this.map!.getLayer(id) == null) {
			return;
		}
		if(layer.onRemoveLayer !== undefined) {
			layer.onRemoveLayer(layer);
		}
		this.map!.removeLayer(id);
	}

	getOptions(type: string) {
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
}
