
import { ButtonControl, ExternalLinkButton } from './button.js';
import { SaveControl } from './save.js';
import * as util from './util.js';
import * as browserImport from './browserImport.js';

import { Protocol } from "pmtiles";
import Cookies from 'js-cookie';
import VectorTextProtocol from 'maplibre-gl-vector-text-protocol';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl, { IControl, LngLat, Map, MapMouseEvent, NavigationControl, ScaleControl, GeolocateControl } from 'maplibre-gl';

const highZoom = 12;

const cookieAttributes: Cookies.CookieAttributes = { expires: 182 };

export class MainControl implements IControl {
	map: Map;
	dummyContainer: HTMLElement | undefined;
	query = new URLSearchParams(window.location.search);

	constructor() {
		VectorTextProtocol.addProtocols(maplibregl); //this code includes our osm feature
		const protocol = new Protocol();
		maplibregl.addProtocol("pmtiles",protocol.tile);
		
		const defaultLatitude = 40;
		const defaultLongitude = -96;
		const defaultZoom = 5;

		let latitude = +(Cookies.get('latitude') || defaultLatitude);
		let longitude = +(Cookies.get('longitude') || defaultLongitude);
		let zoom = +(Cookies.get('zoom') || defaultZoom);

		this.map = new Map({
			container: 'map',
			style: this.getStyleQuery(),
			center: new LngLat(longitude, latitude),
			zoom: zoom,
			hash: true,
			canvasContextAttributes: {
				failIfMajorPerformanceCaveat: true,
			},
			dragRotate: false,
			attributionControl: false,
		});
		this.map.addControl(new maplibregl.AttributionControl({
			customAttribution: 'maplibre', //data attribution comes from the input file
		}));
		this.map.addControl(this); //handles some click events
		this.map.addControl(new NavigationControl());
		this.map.addControl(new ScaleControl({}));
		this.map.addControl(new GeolocateControl({
			positionOptions: {enableHighAccuracy: true},
			trackUserLocation: true
		}));
		const buttonControl = new ButtonControl(this);
		this.map.addControl(buttonControl);
		this.map.addControl(new SaveControl(buttonControl));
		this.map.scrollZoom.setWheelZoomRate(4 / 450); //default is 1 / 450
		this.map.on('load', (event: Event) => this.map.resize()); // https://github.com/mapbox/mapbox-gl-js/issues/8982
	}

	onAdd(map: Map) {
		this.dummyContainer = document.createElement('div');
		this.addMoveListener();
		this.addClickListeners();
		return this.dummyContainer;
	}
	
	onRemove(map: Map) {
		this.dummyContainer!.parentNode!.removeChild(this.dummyContainer!);
	}
	
	addMoveListener() {
		this.map.on('moveend', () => this.checkMove());
		this.checkMove();
		
		this.map.on('zoom', () => this.checkZoom());
		this.checkZoom();
	}
	
	checkZoom() {
		let highZoomEnabled = this.map.getZoom() >= highZoom;
		document.getElementById('footLegend')!.style.opacity = (highZoomEnabled ? 1 : 0).toString();
	}
	
	checkMove() {
		if(this.map.isMoving()) {
			return;
		}
		let latitude = this.map.getCenter().lat, longitude = this.map.getCenter().lng, zoom = this.map.getZoom();

		Cookies.set('latitude', latitude.toString(), cookieAttributes);
		Cookies.set('longitude', longitude.toString(), cookieAttributes);
		Cookies.set('zoom', zoom.toString(), cookieAttributes);
	}

	addClickListeners() {
		this.map.on('mouseup', (event: MapMouseEvent) => {
			if(event.originalEvent.shiftKey) {
				alert(`point:  ${util.pointToString(event.lngLat, 4)}`);
			}
		});
	}

	getStyleQuery() {
		let styleRoot = '';
		let cookieStyle = Cookies.get('style') || null;
		let style = this.query.has('style') ? `style-${this.query.get('style')}.json` : cookieStyle;

		
		if(style != null) {
			Cookies.set('style', style, cookieAttributes);
		}

		return styleRoot + (style != null ? style : 'style.json');
	}
	
	getButtonsQuery() {
		let cookieButtons = Cookies.get('buttons') || null;
		let buttons = this.query.has('buttons') ? this.query.get('buttons') : cookieButtons;
		
		if(buttons != null) {
			Cookies.set('buttons', buttons, cookieAttributes);
		}

		return buttons != null ? buttons : 'buttons.json';
	}

	openOsmEdit() {
		window.open(ExternalLinkButton.formatUrl(this.map!, 'https://www.openstreetmap.org/edit#map={z1}/{latitude}/{longitude}'));
	}
}

export const mainControl = new MainControl();	
browserImport.setupImports();


