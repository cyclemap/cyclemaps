
import { MainControl } from './main';
import { NavigationControl } from './navigation';
import { FetchUtil } from './fetchUtil';

import { IControl, Popup, LayerSpecification, SourceSpecification, Map, MapMouseEvent, MapLayerMouseEvent, MapGeoJSONFeature } from 'maplibre-gl';
import { Feature, FeatureCollection, Geometry } from 'geojson';

const DEFAULT_GEOJSON_TYPE = 'symbol';


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
	group?: string; // deselect others when one part of the group is selected
	depth?: number;
	
	// ExternalLinkButton
	url?: string;
	target?: string;
	
	// LayerButton
	options?: any;
	type?: string;
	source: SourceSpecification | CyclemapLayerSpecification[];
	beforeId?: string;
	active?: boolean;
	layout?: any;
	paint?: any;
	layerIds?: ChangeMap;
}

class Button {
	public layer: CyclemapLayerSpecification;
	protected buttonControl: ButtonControl;
	public buttonElement: HTMLElement;
	public nav: HTMLElement;

	public constructor(layer: CyclemapLayerSpecification, buttonControl: ButtonControl) {
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
	private toggle() {
		const active = this.buttonElement.classList.contains('active');
		if(!active) {
			this.select();
		}
		else {
			this.deselect();
		}
	}
	public select() {
		this.deselectDirectory();
		this.buttonControl.deselectGroup(this.layer.group);
		this.buttonElement.classList.add('active');
	}
	public deselect() {
		this.buttonElement.classList.remove('active');
		this.deselectDirectory();
	}
	protected deselectDirectory() {
		this.buttonControl.deselectDirectories();
	}
}

class DirectoryButton extends Button {
	private directoryNav: HTMLElement;

	public constructor(layer: CyclemapLayerSpecification, buttonControl: ButtonControl) {
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
	public select() {
		super.select();
		this.directoryNav.style.display = 'inherit';
	}
	public deselect() {
		super.deselect();
		this.directoryNav.style.display = 'none';
	}
	protected deselectDirectory() {
		this.buttonControl.deselectDirectories(this.layer.depth);
	}
}

class LayerButton extends Button {
	public constructor(layer: CyclemapLayerSpecification, buttonControl: ButtonControl) {
		super(layer, buttonControl);
	}
	public select() {
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
			...LayerButton.getOptions(this.layer),
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

	public deselect() {
		super.deselect();
		const id = this.layer.id;
		if(this.buttonControl.map!.getLayer(id) == null) {
			return;
		}
		this.buttonControl.map!.removeLayer(id);
	}

	private static getOptions(layer: CyclemapLayerSpecification) {
		if(layer.type! == 'symbol') {
			return {'layout': {
				'icon-image': ["coalesce", ["get", "icon-image"], "marker_11"],
				'icon-size': ["coalesce", ["get", "icon-size"], 1],
				'text-field': '{title}',
				'icon-allow-overlap': true,
				'text-allow-overlap': true,
				'text-anchor': 'top',
				'text-font': ['Noto Sans Regular'],
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
		else if(layer.type! == 'line') {
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
		else if(layer.type! == 'fill') {
			return {'paint': {
				'fill-color': '#00d',
				'fill-outline-color': '#00a',
				'fill-opacity': .12,
			}};
		}
		else if(layer.type! == 'heatmap') {
			return {
				"maxzoom": 16,
				"minzoom": 7,
				"paint": {
					"heatmap-weight":
						["*",
							["coalesce", ["get", "count"], 1],
							layer.options?.weight ?? 0.00001,
						]
					,
					"heatmap-intensity": {
						"type": "exponential",
						"stops": [
							[8, 0.1],
							[16, 3000]
						]
					},
					"heatmap-radius": {
						"type": "exponential",
						"stops": [
							[8, 1],
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
		else if(layer.type! == 'raster') {
			return;
		}
		console.error('unknown type: ', layer.type!);
	}
}

class RainButton extends LayerButton {
	public constructor(layer: CyclemapLayerSpecification, buttonControl: ButtonControl) {
		super(layer, buttonControl);
	}
	public select() {
		super.select();
		document.getElementById('rainLegend')!.style.display = 'inline-block';
	}
	public deselect() {
		document.getElementById('rainLegend')!.style.display = 'none';
		super.deselect();
	}
}

class NavigationButton extends Button {
	private navigationControl: NavigationControl;
	public constructor(layer: CyclemapLayerSpecification, buttonControl: ButtonControl) {
		super(layer, buttonControl);
		this.navigationControl = new NavigationControl();
	}
	public select() {
		super.select();
		this.buttonControl.map!.addControl(this.navigationControl);
	}
	public deselect() {
		this.buttonControl.map!.removeControl(this.navigationControl);
		super.deselect();
	}
}

class ResetButton extends Button {
	public constructor(layer: CyclemapLayerSpecification, buttonControl: ButtonControl) {
		super(layer, buttonControl);
	}
	public select() {
		super.select();
		super.deselect();
		this.buttonControl.deselectAll();
	}
}

class AboutButton extends Button {
	public constructor(layer: CyclemapLayerSpecification, buttonControl: ButtonControl) {
		super(layer, buttonControl);
	}
	public select() {
		super.select();
		super.deselect();
		document.getElementById('about')!.style.display = 'inherit';
	}
	public deselect() {
		super.deselect();
		document.getElementById('about')!.style.display = 'none';
	}
}

class LayerIdsButton extends Button {
	private originalProperties: ChangeMap = {};
	public constructor(layer: CyclemapLayerSpecification, buttonControl: ButtonControl) {
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
	public select() {
		super.select();
		this.apply(this.layer.layerIds!);
	}
	public deselect() {
		//switch it all back
		this.apply(this.originalProperties);
		super.deselect();
	}
	private apply(changeMap: ChangeMap) {
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
	public constructor(layer: CyclemapLayerSpecification, buttonControl: ButtonControl) {
		super(layer, buttonControl);
	}
	public select() {
		super.select();
		super.deselect();
		const url = this.layer.url;
		if(url === undefined) {
			console.error('url not defined');
			return;
		}
		const target = this.layer.target ?? '_blank';
		window.open(ExternalLinkButton.formatUrl(this.buttonControl.map!, url), target);
	}
	public static formatUrl(map: Map, url: string) {
		return url
			.replace("{z1}", (map.getZoom() + 1).toFixed(0))
			.replace("{z}", (map.getZoom()).toFixed(0))
			.replace("{latitude}", map.getCenter().lat.toFixed(5))
			.replace("{longitude}", map.getCenter().lng.toFixed(5));
	}
}
		
export class ButtonControl implements IControl {
	public map: Map | undefined;
	private container: HTMLElement | undefined;
	public buttons: {[buttonId: string]: Button} = {};
	public savePointUrl: string | undefined;

	public onAdd(map: Map) {
		this.map = map;
		this.map!.on('click', (event: MapMouseEvent) =>
			this.deselectDirectories()
		);
		//this.container = DOM.create('div', 'maplibregl-ctrl maplibregl-ctrl-group');
		this.container = document.createElement('div');
		this.container.className = 'maplibregl-ctrl';
		this.checkAddButtons().then(() => {});
		this.setupButtons();
		return this.container;
	}
	
	public onRemove(map: Map) {
		this.container!.parentNode!.removeChild(this.container!);
		this.map = undefined;
	}
	
	private checkAddGeoJsonLayer() {
		const geoJsonData: string | null = MainControl.getQuery('geo');
		const type: string = MainControl.getQuery('type') ?? DEFAULT_GEOJSON_TYPE;
		const options: any = JSON.parse(MainControl.getQuery('options') ?? '{}');
		if(geoJsonData === null) {
			return;
		}
		this.addLayerHelper('geoJsonData', type, options, geoJsonData!);
	}
	
	private addLayerHelper(id: string, type: string, options: any, data: FeatureCollection | Feature | string) {
		this.addLayerButton({
			id,
			type,
			options,
			'class': 'layer',
			'source': {
				'type': 'geojson',
				data
			},
			'active': true
		});
	}

	private async checkAddButtons() {
		const buttons = MainControl.getButtonsQuery();
		if(buttons === null) {
			return;
		}
		const data: {savePointUrl?: string, buttons: CyclemapLayerSpecification[]} = await FetchUtil.fetchAndParse(buttons);
		this.savePointUrl = data.savePointUrl;
		this.map!.on('style.load', (event: Event) => {
			this.addLayerButtons(data.buttons);
		});
		this.map!.on('load', (event: Event) => {
			this.addLayerButtons(data.buttons);
			this.setupIcons();
			this.checkAddGeoJsonLayer();
		});
	}

	private setupButtons() {
		const buttonHolder = document.getElementById('buttonHolder');

		if(buttonHolder !== null) {
			const destination = document.getElementsByClassName('maplibregl-ctrl-top-left')[0];
			destination.append(document.getElementById('buttonHolder')!);
		}
	}

	public addLayerButtons(layers: CyclemapLayerSpecification[], root: HTMLElement | null = null) {
		for(const layer of layers) {
			this.addLayerButton(layer, root);
		}
	}
	
	/*
	private removeLayerButtons(layers: CyclemapLayerSpecification[]) {
		for(const layer of layers) {
			if(layer.id in this.buttons) {
				this.removeLayerButton(this.buttons[layer.id]);
			}
		}
	}
	*/

	private generatorMap: {[layerClass: string]: (layer: CyclemapLayerSpecification)=>Button} = {
		directory: layer => new DirectoryButton(layer, this),
		rain: layer => new RainButton(layer, this),
		layer: layer => new LayerButton(layer, this),
		reset: layer => new ResetButton(layer, this),
		about: layer => new AboutButton(layer, this),
		layerIds: layer => new LayerIdsButton(layer, this),
		externalLink: layer => new ExternalLinkButton(layer, this),
		navigation: layer => new NavigationButton(layer, this),
	};

	private generateButton(layer: CyclemapLayerSpecification) {
		if(layer.class === undefined) {
			layer.class = 'externalLink';
		}
		if(!(layer.class in this.generatorMap)) {
			console.error(`could not find class ${layer.class} in generator map`);
		}
		return this.generatorMap[layer.class](layer);
	}

	private addLayerButton(layer: CyclemapLayerSpecification, root: HTMLElement | null = null) {
		if(document.getElementById(layer.id) != null) {
			return;
		}
		
		const button = this.generateButton(layer);
		const buttonHolder = root !== null ? root : document.getElementById('buttonHolder');
		if(buttonHolder !== null) {
			buttonHolder.appendChild(button.nav);
		}
		if(layer.active) {
			button.select();
		}
	}

	private removeLayerButton(button: Button) {
		button.deselect();
		const id = button.layer.id;
		if(this.map!.getSource(id) != null) {
			this.map!.removeSource(id);
		}
		button.buttonElement.remove();
	}

	/*
	private removeLayerButtonById(id: string) {
		const button: Button = this.buttons[id];
		if(button !== undefined) {
			this.removeLayerButton(button);
		}
	}

	private removeLayerById(id: string) {
		const button: Button = this.buttons[id];
		if(button !== undefined) {
			button.deselect();
		}
	}
	*/

	public deselectAll() {
		Object.values(this.buttons)
			.filter(button => button.buttonElement.classList.contains('active'))
			.forEach(button => button.deselect())
	}

	public deselectGroup(group: string | undefined) {
		if(group === undefined) {
			return;
		}
		Object.values(this.buttons)
			.filter(button =>
				button.layer.group === group &&
				button.buttonElement.classList.contains('active'))
			.forEach(button => button.deselect())
	}

	public deselectDirectories(depth: number | undefined = undefined) {
		Object.values(this.buttons)
			.filter(button =>
				button instanceof DirectoryButton &&
				(depth === undefined || button.layer.depth === depth) &&
				!button.layer.active && //ignore the ones that started on
				button.buttonElement.classList.contains('active'))
			.forEach(button => button.deselect())
	}

	private setupIcons() {
		this.map!.loadImage('sprite/2197.png').then(response => this.map!.addImage('upright', response.data));
		this.map!.loadImage('sprite/2198.png').then(response => this.map!.addImage('downright', response.data));
		this.map!.loadImage('sprite/27a1.png').then(response => this.map!.addImage('right', response.data));
	}
}

