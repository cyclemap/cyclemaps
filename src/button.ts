
import { MainControl } from './main';
import { NavigationControl } from './navigation';
import { FetchUtil } from './fetchUtil';

import { AllLayoutProperties, AllPaintProperties, IControl, Popup, LayerSpecification, SourceSpecification, Map, MapLibreEvent, MapMouseEvent, MapLayerMouseEvent, MapGeoJSONFeature } from 'maplibre-gl';
import { Feature, FeatureCollection, Geometry } from 'geojson';

const DEFAULT_GEOJSON_TYPE = 'symbol';


interface Change {
	propertyType: 'layout' | 'paint' | 'zoom';
	value: any;
}

interface LayoutChange extends Change {
	propertyType: 'layout';
	property: keyof AllLayoutProperties;
}

interface PaintChange extends Change {
	propertyType: 'paint';
	property: keyof AllPaintProperties;
}

interface ZoomChange extends Change {
	propertyType: 'zoom';
}

type Changes = (LayoutChange | PaintChange | ZoomChange)[];
type ChangeMap = {[layerId: string]: Changes};
type ChangeList = {layerIds: string[], changes: Changes}[];

interface ButtonProperties {
	id: string;
	name?: string;
	class?: string;
	group?: string; // deselect others when one part of the group is selected, also show in parent
	depth?: number;
	parent?: DirectoryButton;
	
	// ExternalLinkButton
	url?: string;
	target?: string;
	
	// LayerButton
	options?: any;
	type?: string;
	source: SourceSpecification | ButtonProperties[];
	beforeId?: string;
	active?: boolean;
	minzoom?: number;
	maxzoom?: number;
	layout?: any;
	paint?: any;
	changes?: ChangeList;
}

class Button {
	public readonly properties: ButtonProperties;
	protected readonly buttonControl: ButtonControl;
	public readonly buttonElement: HTMLElement;
	public readonly nav: HTMLElement;
	public readonly parent: Button | undefined;

	public constructor(properties: ButtonProperties, buttonControl: ButtonControl) {
		const id = properties.id;
		
		this.properties = properties;
		this.buttonControl = buttonControl;

		properties.depth = properties.depth ?? 0;
		
		this.buttonControl.buttons[id] = this;
		
		this.buttonElement = document.createElement('button');
		this.nav = document.createElement('nav');

		this.nav.appendChild(this.buttonElement);
		
		this.buttonElement.setAttribute('id', id);
		this.buttonElement.setAttribute('class', 'maplibregl-ctrl maplibregl-ctrl-group');
		
		this.buttonElement.onclick = (event: Event) => this.toggle();

		this.setupName();
	}
	private setupName() {
		const properties = this.properties;
		const id = properties.id;
		properties.name = properties.name !== undefined ? properties.name : id.replaceAll('-', ' ');
		if(this.buttonElement.childNodes.length > 0) {
			this.buttonElement.childNodes[0].textContent = properties.name;
		}
		else {
			this.buttonElement.appendChild(document.createTextNode(properties.name));
		}
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
		this.buttonControl.deselectGroup(this.properties.group);
		this.buttonElement.classList.add('active');
		this.checkShowOnParent();
	}
	public deselect() {
		this.buttonElement.classList.remove('active');
		this.deselectDirectory();
		this.checkUnshowOnParent();
	}
	protected deselectDirectory() {
		this.buttonControl.deselectDirectories();
	}
	private remove() {
		this.nav.remove();
		this.buttonElement.remove();
	}
	private checkShowOnParent() {
		const parent = this.properties.parent;
		if(this.properties.group !== undefined && parent !== undefined) {
			parent.buttonElement.classList.add('child-active');
			parent.properties.name = this.properties.name;
			parent.setupName();
		}
	}
	private checkUnshowOnParent() {
		const parent = this.properties.parent;
		if(this.properties.group !== undefined && parent !== undefined) {
			parent.buttonElement.classList.remove('child-active');
			parent.properties.name = undefined;
			parent.setupName();
		}
	}
}

class DirectoryButton extends Button {
	public readonly directoryNav: HTMLElement;

	public constructor(properties: ButtonProperties, buttonControl: ButtonControl) {
		super(properties, buttonControl);
		
		const className = `buttonHolder${properties.depth!%2==0 ? 'Even' : 'Odd'}`;
		
		this.directoryNav = document.createElement('nav');
		this.directoryNav.classList.add(className);
		this.nav.classList.add(className);
		this.nav.appendChild(this.directoryNav);

		if(properties.active === undefined || properties.active) {
			this.directoryNav.style.display = 'none';
		}

		const children = (properties.source as ButtonProperties[])
			.map(child => (
				{...child,
					parent: this,
					depth: properties.depth!+1,
				}
			));
		
		this.buttonControl.addButtons(children);
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
		this.buttonControl.deselectDirectories(this.properties.depth);
	}
}

class LayerButton extends Button {
	public constructor(properties: ButtonProperties, buttonControl: ButtonControl) {
		super(properties, buttonControl);
	}
	public select() {
		super.select();
		const id = this.properties.id;
		if(this.properties.beforeId != null && this.buttonControl.map!.getLayer(this.properties.beforeId) == null) {
			this.properties.beforeId = undefined;
		}
		
		if(this.buttonControl.map!.getSource(id) == null) {
			this.buttonControl.map!.addSource(id, this.properties.source as SourceSpecification);
		}

		this.buttonControl.map!.addLayer({
			id,
			type: this.properties.type,
			source: id,
			layout: this.properties.layout ?? {},
			paint: this.properties.paint ?? {},
			minzoom: this.properties?.minzoom,
			maxzoom: this.properties?.maxzoom,
			...LayerButton.getOptions(this.properties),
		} as (LayerSpecification & {source?: string | SourceSpecification}), this.properties.beforeId);

		if(this.properties.type === 'symbol') {
			const map = this.buttonControl.map!;
			this.buttonControl.map!.on('click', id, (event: MapLayerMouseEvent) => {
				const features: MapGeoJSONFeature[] = event.features!;
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
		const id = this.properties.id;
		if(this.buttonControl.map!.getLayer(id) == null) {
			return;
		}
		this.buttonControl.map!.removeLayer(id);
	}

	private static getOptions(properties: ButtonProperties) {
		if(properties.type! == 'symbol') {
			return {
				layout: {
					'icon-image': ['coalesce', ['get', 'icon-image'], 'marker_11'],
					'icon-size': ['coalesce', ['get', 'icon-size'], 1],
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
				paint: {
					'text-color': '#666',
					'text-halo-blur': 0.5,
					'text-halo-color': 'white',
					'text-halo-width': 2,
				},
			};
		}
		else if(properties.type! == 'line') {
			return {
				layout: {
					'line-join': 'round',
				},
				paint: {
					'line-color': '#00d',
					'line-width': {
						base: 1.2,
						stops: [[6, 2], [20, 20]],
					},
					'line-opacity': .4,
				},
			};
		}
		else if(properties.type! == 'fill') {
			return {
				paint: {
					'fill-color': '#00d',
					'fill-outline-color': '#00a',
					'fill-opacity': .12,
				},
			};
		}
		else if(properties.type! == 'heatmap') {
			return {
				minzoom: 7,
				maxzoom: 16,
				paint: {
					'heatmap-weight':
						['*',
							['coalesce', ['get', 'count'], 1],
							properties.options?.weight ?? 0.00001,
						],
					'heatmap-intensity': {
						type: 'exponential',
						stops: [
							[8, 0.1],
							[16, 3000],
						],
					},
					'heatmap-radius': {
						type: 'exponential',
						stops: [
							[8, 1],
							[16, 20],
						],
					},
					'heatmap-color': [
						'interpolate',
						['linear'],
						['heatmap-density'],
						0, 'rgba(0,0,0,0)',
						0.1, '#103',
						0.3, '#926',
						0.4, '#f71',
						0.5, '#ffa',
					],
					'heatmap-opacity': 0.8,
				},
			};
		}
		else if(properties.type! == 'raster') {
			return;
		}
		console.error('unknown type: ', properties.type!);
	}
}

class RainButton extends LayerButton {
	public constructor(properties: ButtonProperties, buttonControl: ButtonControl) {
		super(properties, buttonControl);
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
	public constructor(properties: ButtonProperties, buttonControl: ButtonControl) {
		super(properties, buttonControl);
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
	public constructor(properties: ButtonProperties, buttonControl: ButtonControl) {
		super(properties, buttonControl);
	}
	public select() {
		super.select();
		super.deselect();
		this.buttonControl.deselectAll();
	}
}

class AboutButton extends Button {
	public constructor(properties: ButtonProperties, buttonControl: ButtonControl) {
		super(properties, buttonControl);
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
	private readonly originalProperties: ChangeMap = {};
	public constructor(properties: ButtonProperties, buttonControl: ButtonControl) {
		super(properties, buttonControl);
		const map = this.buttonControl.map!;
		this.properties.changes!.forEach(({layerIds, changes}) =>
			layerIds.forEach(layerId => {
				const properties = map.getLayer(layerId);
				if(properties === undefined) {
					console.error(`properties ${layerId} is not found in the map`);
					return;
				}
				this.originalProperties[layerId] = [];
				changes.forEach(change => {
					if(change.propertyType === 'layout') {
						this.originalProperties[layerId].push({...change, value: map.getLayoutProperty(layerId, change.property)});
					}
					else if(change.propertyType === 'paint') {
						this.originalProperties[layerId].push({...change, value: map.getPaintProperty(layerId, change.property)});
					}
					else if(change.propertyType === 'zoom') {
						const minzoom = properties.minzoom, maxzoom = properties.maxzoom;
						this.originalProperties[layerId].push({...change, value: {minzoom, maxzoom}});
					}
				});
			})
		);
	}
	public select() {
		super.select();
		this.properties.changes!.forEach(({layerIds, changes}) =>
			layerIds.forEach(layerId =>
				this.apply(layerId, changes)));
	}
	public deselect() {
		//switch it all back
		Object.entries(this.originalProperties).forEach(([layerId, changes]) => 
			this.apply(layerId, changes));
		super.deselect();
	}
	private apply(layerId: string, changes: Changes) {
		const map = this.buttonControl.map!;
		changes.forEach(change => {
			if(change.propertyType === 'layout') {
				map.setLayoutProperty(layerId, change.property, change.value);
			}
			else if(change.propertyType === 'paint') {
				map.setPaintProperty(layerId, change.property, change.value);
			}
			else if(change.propertyType === 'zoom') {
				map.setLayerZoomRange(layerId, change.value.minzoom, change.value.maxzoom);
			}
		});
	}
}

export class ExternalLinkButton extends Button {
	public constructor(properties: ButtonProperties, buttonControl: ButtonControl) {
		super(properties, buttonControl);
	}
	public select() {
		super.select();
		super.deselect();
		const url = this.properties.url;
		if(url === undefined) {
			console.error('url not defined');
			return;
		}
		const target = this.properties.target ?? '_blank';
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
	public readonly buttons: {[buttonId: string]: Button} = {};
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
		this.addButton({
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
		const data: {savePointUrl?: string, buttons: ButtonProperties[]} = await FetchUtil.fetchAndParse(buttons);
		this.savePointUrl = data.savePointUrl;
		this.map!.on('style.load', (event: MapLibreEvent) => {
			this.addButtons(data.buttons);
		});
		this.map!.on('load', (event: MapLibreEvent) => {
			this.addButtons(data.buttons);
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

	public addButtons(propertiesList: ButtonProperties[]) {
		propertiesList
			.forEach(properties => this.addButton(properties));
	}
	
	private generatorMap: {[buttonClass: string]: (properties: ButtonProperties)=>Button} = {
		directory: properties => new DirectoryButton(properties, this),
		rain: properties => new RainButton(properties, this),
		layer: properties => new LayerButton(properties, this),
		reset: properties => new ResetButton(properties, this),
		about: properties => new AboutButton(properties, this),
		layerIds: properties => new LayerIdsButton(properties, this),
		externalLink: properties => new ExternalLinkButton(properties, this),
		navigation: properties => new NavigationButton(properties, this),
	};

	private generateButton(properties: ButtonProperties) {
		if(properties.class === undefined) {
			properties.class = 'externalLink';
		}
		if(!(properties.class in this.generatorMap)) {
			console.error(`could not find class ${properties.class} in generator map`);
		}
		return this.generatorMap[properties.class](properties);
	}

	private addButton(properties: ButtonProperties) {
		if(document.getElementById(properties.id) != null) {
			return;
		}
		
		const button = this.generateButton(properties);
		const buttonHolder = properties.parent !== undefined ? properties.parent.directoryNav : document.getElementById('buttonHolder');
		if(buttonHolder !== null) {
			buttonHolder.appendChild(button.nav);
		}
		if(properties.active) {
			button.select();
		}
	}

	public deselectById(id: string) {
		if(!(id in this.buttons)) {
			return;
		}
		this.buttons[id].deselect();
	}

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
				button.properties.group === group &&
				button.buttonElement.classList.contains('active'))
			.forEach(button => button.deselect())
	}

	public deselectDirectories(depth: number | undefined = undefined) {
		Object.values(this.buttons)
			.filter(button =>
				button instanceof DirectoryButton &&
				(depth === undefined || button.properties.depth === depth) &&
				!button.properties.active && //ignore the ones that started on
				button.buttonElement.classList.contains('active'))
			.forEach(button => button.deselect())
	}

	private setupIcons() {
		this.map!.loadImage('sprite/2197.png').then(response => this.map!.addImage('upright', response.data));
		this.map!.loadImage('sprite/2198.png').then(response => this.map!.addImage('downright', response.data));
		this.map!.loadImage('sprite/27a1.png').then(response => this.map!.addImage('right', response.data));
	}
}

