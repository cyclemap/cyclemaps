
import { MainControl } from './main.js';
import * as util from './util.js';

import { IControl, Popup, LayerSpecification, SourceSpecification, Map, MapMouseEvent, MapLayerMouseEvent, MapGeoJSONFeature } from 'maplibre-gl';
import { Feature, FeatureCollection, Geometry } from 'geojson';

const DEFAULT_GEOJSON_TYPE = 'line';


interface Change {
	propertyType: string;
	property: string;
	value: any;
}

type ChangeMap = {[layerId: string]: Change[]};

export interface CyclemapLayerSpecification {
	id: string;
	name?: string;
	class?: string;
	url?: string;
	group?: string;
	type?: string;
	source: SourceSpecification | CyclemapLayerSpecification[];
	beforeId?: string;
	active?: boolean;
	layout?: any;
	paint?: any;
	layerIds?: ChangeMap;
	depth?: number;
}

class Button {
	layer: CyclemapLayerSpecification;
	buttonControl: ButtonControl;
	buttonElement: HTMLElement;
	nav: HTMLElement;

	constructor(layer: CyclemapLayerSpecification, buttonControl: ButtonControl) {
		const id = layer.id;
		
		this.layer = layer;
		this.buttonControl = buttonControl;

		layer.depth = layer.depth ?? 0;
		
		this.buttonControl.buttons[id] = this;
		
		this.buttonElement = document.createElement('button');
		this.nav = document.createElement('nav');

		this.nav.appendChild(this.buttonElement);
		
		this.buttonElement.setAttribute('id', id);
		this.buttonElement.setAttribute('class', 'maplibregl-ctrl maplibregl-ctrl-group');
		
		const name = layer.name !== undefined ? layer.name : id.replace('-', ' ');
		this.buttonElement.appendChild(document.createTextNode(name));
		this.buttonElement.onclick = (event: Event) => this.toggle();
	}
	toggle() {
		const active = this.buttonElement.classList.contains('active');
		if(!active) {
			this.select();
		}
		else {
			this.deselect();
		}
	}
	select() {
		this.deselectDirectory();
		this.buttonControl.deselectGroup(this.layer.group);
		this.buttonElement.classList.add('active');
	}
	deselect() {
		this.buttonElement.classList.remove('active');
		this.deselectDirectory();
	}
	deselectDirectory() {
		this.buttonControl.deselectDirectories();
	}
}

class DirectoryButton extends Button {
	directoryNav: HTMLElement;

	constructor(layer: CyclemapLayerSpecification, buttonControl: ButtonControl) {
		super(layer, buttonControl);
		
		const className = `buttonHolder${layer.depth!%2==0 ? 'Even' : 'Odd'}`;
		
		this.directoryNav = document.createElement('nav');
		this.directoryNav.classList.add(className);
		this.nav.classList.add(className);
		this.nav.appendChild(this.directoryNav);

		if(layer.active === undefined || layer.active) {
			this.directoryNav.style.display = 'none';
		}

		const children = layer.source as CyclemapLayerSpecification[];
		children.forEach(child => child.depth = layer.depth!+1);
		
		this.buttonControl.addLayerButtons(layer.source as CyclemapLayerSpecification[], this.directoryNav as HTMLElement);
	}
	select() {
		super.select();
		this.directoryNav.style.display = 'inherit';
	}
	deselect() {
		super.deselect();
		this.directoryNav.style.display = 'none';
	}
	deselectDirectory() {
		this.buttonControl.deselectDirectories(this.layer.depth);
	}
}

class LayerButton extends Button {
	constructor(layer: CyclemapLayerSpecification, buttonControl: ButtonControl) {
		super(layer, buttonControl);
	}
	select() {
		super.select();
		const id = this.layer.id;
		if(this.layer.beforeId != null && this.buttonControl.map!.getLayer(this.layer.beforeId) == null) {
			this.layer.beforeId = undefined;
		}
		
		if(this.buttonControl.map!.getSource(id) == null) {
			this.buttonControl.map!.addSource(id, this.layer.source as SourceSpecification);
		}

		this.buttonControl.map!.addLayer({
			id,
			type: this.layer.type,
			source: id,
			layout: this.layer.layout ?? {},
			paint: this.layer.paint ?? {},
			...this.getOptions(this.layer.type!),
		} as (LayerSpecification & {source?: string | SourceSpecification}), this.layer.beforeId);
		

		if(this.layer.type === 'symbol') {
			const map = this.buttonControl.map!;
			this.buttonControl.map!.on('click', id, (event: MapMouseEvent) => {
				const features: MapGeoJSONFeature[] = (event as MapLayerMouseEvent).features!;
				if(features == null || features[0]?.properties?.description == null) {
					return;
				}
				const geometry: Geometry = features[0].geometry;
				const description = features[0].properties.description;

				if(geometry.type == 'Point') {
					new Popup({maxWidth: 'none'})
						.setLngLat(geometry.coordinates as [number,number])
						.setHTML(description)
						.addTo(map);
				}
			});
		}
	}

	deselect() {
		super.deselect();
		const id = this.layer.id;
		if(this.buttonControl.map!.getLayer(id) == null) {
			return;
		}
		this.buttonControl.map!.removeLayer(id);
	}

	getOptions(type: string) {
		if(type == 'symbol') {
			return {'layout': {
				'icon-image': ["coalesce", ["get", "icon-image"], "marker_11"],
				'icon-size': ["coalesce", ["get", "icon-size"], 1],
				'text-field': '{title}',
				'icon-allow-overlap': true,
				'text-allow-overlap': true,
				'text-anchor': 'top',
				'text-font': ['Open Sans Regular'],
				'text-max-width': 9,
				'icon-offset': [0, -3],
				'text-offset': [0, .75],
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

class RainButton extends LayerButton {
	constructor(layer: CyclemapLayerSpecification, buttonControl: ButtonControl) {
		super(layer, buttonControl);
	}
	select() {
		super.select();
		document.getElementById('rainLegend')!.style.display = 'inline-block';
	}
	deselect() {
		document.getElementById('rainLegend')!.style.display = 'none';
		super.deselect();
	}
}

class ResetButton extends Button {
	constructor(layer: CyclemapLayerSpecification, buttonControl: ButtonControl) {
		super(layer, buttonControl);
	}
	select() {
		super.select();
		super.deselect();
		this.buttonControl.deselectAll();
	}
}

class AboutButton extends Button {
	constructor(layer: CyclemapLayerSpecification, buttonControl: ButtonControl) {
		super(layer, buttonControl);
	}
	select() {
		super.select();
		super.deselect();
		document.getElementById('about')!.style.display = 'inherit';
	}
	deselect() {
		super.deselect();
		document.getElementById('about')!.style.display = 'none';
	}
}

class LayerIdsButton extends Button {
	originalProperties: ChangeMap = {};
	constructor(layer: CyclemapLayerSpecification, buttonControl: ButtonControl) {
		super(layer, buttonControl);
		const map = this.buttonControl.map!;
		Object.entries(this.layer.layerIds!).forEach(([layerId, changes]) => {
			const layer = map.getLayer(layerId);
			if(layer === undefined) {
				console.error(`layer ${layerId} is not found in the map`);
				return;
			}
			this.originalProperties[layerId] = [];
			changes.forEach(change => {
				const propertyType = change.propertyType, property = change.property, value = change.value;
				if(propertyType === 'layout') {
					this.originalProperties[layerId].push({propertyType, property, value: map.getLayoutProperty(layerId, property)});
				}
				else if(propertyType === 'paint') {
					this.originalProperties[layerId].push({propertyType, property, value: map.getPaintProperty(layerId, property)});
				}
				else if(propertyType === 'zoom') {
					const minzoom = layer.minzoom, maxzoom = layer.maxzoom;
					this.originalProperties[layerId].push({propertyType, property, value: {minzoom, maxzoom}});
				}
			});
		});
	}
	select() {
		super.select();
		this.apply(this.layer.layerIds!);
	}
	deselect() {
		//switch it all back
		this.apply(this.originalProperties);
		super.deselect();
	}
	apply(changeMap: ChangeMap) {
		const map = this.buttonControl.map!;
		Object.entries(changeMap).forEach(([layerId, changes]) => {
			changes.forEach(change => {
				const propertyType = change.propertyType, property = change.property, value = change.value;
				if(propertyType === 'layout') {
					map.setLayoutProperty(layerId, property, value);
				}
				else if(propertyType === 'paint') {
					map.setPaintProperty(layerId, property, value);
				}
				else if(propertyType === 'zoom') {
					map.setLayerZoomRange(layerId, value.minzoom, value.maxzoom);
				}
			});
		});
	}
}

export class ExternalLinkButton extends Button {
	constructor(layer: CyclemapLayerSpecification, buttonControl: ButtonControl) {
		super(layer, buttonControl);
	}
	select() {
		super.select();
		super.deselect();
		let url = this.layer.url;
		if(url === undefined) {
			console.error('url not defined');
			return;
		}
		window.open(ExternalLinkButton.formatUrl(this.buttonControl.map!, url));
	}
	static formatUrl(map: Map, url: string) {
		return url
			.replace("{z1}", (map.getZoom() + 1).toFixed(0))
			.replace("{z}", (map.getZoom()).toFixed(0))
			.replace("{latitude}", map.getCenter().lat.toFixed(5))
			.replace("{longitude}", map.getCenter().lng.toFixed(5));
	}
}
		
export class ButtonControl implements IControl {
	mainControl: MainControl;
	map: Map | undefined;
	container: HTMLElement | undefined;
	buttons: {[buttonId: string]: Button} = {};
	savePointUrl: string | undefined;

	constructor(mainControl: MainControl) {
		this.mainControl = mainControl;
	}

	onAdd(map: Map) {
		this.map = map;
		this.map.on('click', (event: MapMouseEvent) =>
			this.deselectDirectories()
		);
		//this.container = DOM.create('div', 'maplibregl-ctrl maplibregl-ctrl-group');
		this.container = document.createElement('div');
		this.container.className = 'maplibregl-ctrl';
		this.checkAddButtons();
		this.setupButtons();
		return this.container;
	}
	
	onRemove(map: Map) {
		this.container!.parentNode!.removeChild(this.container!);
		this.map = undefined;
	}
	
	checkAddGeoJsonLayer() {
		const geoJsonData: string | null = this.mainControl.query.get('geo'), type: string = this.mainControl.query.get('type') ?? DEFAULT_GEOJSON_TYPE;
		if(geoJsonData === null) {
			return;
		}
		this.addLayerHelper('geoJsonData', type, geoJsonData!);
	}

	checkAddButtons() {
		const buttons = this.mainControl.getButtonsQuery();
		if(buttons === null) {
			return;
		}
		util.ajaxGet(buttons, (data: {savePointUrl?: string, buttons: CyclemapLayerSpecification[]}) => {
			this.savePointUrl = data.savePointUrl;
			this.map!.on('style.load', (event: Event) => {
				this.addLayerButtons(data.buttons);
			});
			this.map!.on('load', (event: Event) => {
				this.addLayerButtons(data.buttons);
				this.setupIcons();
				this.checkAddGeoJsonLayer();
			});
		});
	}

	setupButtons() {
		const destination = document.getElementsByClassName('maplibregl-ctrl-top-left')[0];
		destination.append(document.getElementById('buttonHolder')!);
	}

	addLayerButtons(layers: CyclemapLayerSpecification[], root: HTMLElement | null = null) {
		for(const layer of layers) {
			this.addLayerButton(layer, root);
		}
	}
	
	removeLayerButtons(layers: CyclemapLayerSpecification[]) {
		for(const layer of layers) {
			if(layer.id in this.buttons) {
				this.removeLayerButton(this.buttons[layer.id]);
			}
		}
	}

	addLayerHelper(id: string, type: string, data: FeatureCollection | Feature | string) {
		this.addLayerButton({"id": id, "type": type, "class": "layer", "source": {"type": "geojson", "data": data}, "active": true});
	}

	generatorMap: {[layerClass: string]: (layer: CyclemapLayerSpecification)=>Button} = {
		directory: layer => new DirectoryButton(layer, this),
		rain: layer => new RainButton(layer, this),
		layer: layer => new LayerButton(layer, this),
		reset: layer => new ResetButton(layer, this),
		about: layer => new AboutButton(layer, this),
		layerIds: layer => new LayerIdsButton(layer, this),
		externalLink: layer => new ExternalLinkButton(layer, this),
	};

	generateButton(layer: CyclemapLayerSpecification) {
		if(layer.class === undefined) {
			layer.class = 'externalLink';
		}
		if(!(layer.class in this.generatorMap)) {
			console.error(`could not find class ${layer.class} in generator map`);
		}
		return this.generatorMap[layer.class](layer);
	}

	addLayerButton(layer: CyclemapLayerSpecification, root: HTMLElement | null = null) {
		if(document.getElementById(layer.id) != null) {
			return;
		}
		
		const button = this.generateButton(layer);
		(root != null ? root : document.getElementById('buttonHolder')!).appendChild(button.nav);
		if(layer.active) {
			button.select();
		}
	}

	removeLayerButton(button: Button) {
		button.deselect();
		const id = button.layer.id;
		if(this.map!.getSource(id) != null) {
			this.map!.removeSource(id);
		}
		button.buttonElement.remove();
	}

	removeLayerButtonById(id: string) {
		const button: Button = this.buttons[id];
		if(button !== undefined) {
			this.removeLayerButton(button);
		}
	}

	removeLayerById(id: string) {
		const button: Button = this.buttons[id];
		if(button !== undefined) {
			button.deselect();
		}
	}

	deselectAll() {
		Object.values(this.buttons)
			.filter(button => button.buttonElement.classList.contains('active'))
			.forEach(button => button.deselect())
	}

	deselectGroup(group: string | undefined) {
		if(group === undefined) {
			return;
		}
		Object.values(this.buttons)
			.filter(button =>
				button.layer.group === group &&
				button.buttonElement.classList.contains('active'))
			.forEach(button => button.deselect())
	}

	deselectDirectories(depth: number | undefined = undefined) {
		Object.values(this.buttons)
			.filter(button =>
				button instanceof DirectoryButton &&
				(depth === undefined || button.layer.depth === depth) &&
				!button.layer.active && //ignore the ones that started on
				button.buttonElement.classList.contains('active'))
			.forEach(button => button.deselect())
	}

	setupIcons() {
		this.map!.loadImage('sprite/2197.png', (error, image) => {
			if (error) throw error;
			if(image == null) {
				console.error('trouble loading image');
				return;
			}
			this.map!.addImage('upright', image);
		});
		this.map!.loadImage('sprite/2198.png', (error, image) => {
			if (error) throw error;
			if(image == null) {
				console.error('trouble loading image');
				return;
			}
			this.map!.addImage('downright', image);
		});
		this.map!.loadImage('sprite/27a1.png', (error, image) => {
			if (error) throw error;
			if(image == null) {
				console.error('trouble loading image');
				return;
			}
			this.map!.addImage('right', image);
		});
	}
}
