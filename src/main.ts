
import { ButtonControl, ExternalLinkButton } from './button';
import { SaveControl } from './save';
import { FetchUtil } from './fetchUtil';
import { PointUtil } from './pointUtil';
import * as browserImport from './browserImport';

import { Protocol } from "pmtiles";
import Cookies from 'js-cookie';
import VectorTextProtocol from 'maplibre-gl-vector-text-protocol';
import * as maplibregl from 'maplibre-gl';
import { addProtocol, AttributionControl, IControl, LngLat, Map, MapMouseEvent, MapLibreEvent, NavigationControl, ScaleControl, GeolocateControl, setWorkerUrl, MapLayerMouseEvent, MapGeoJSONFeature, Popup } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css'; // see globals.d.ts for where this is included in the output

const highZoom = 12;

const cookieAttributes: Cookies.CookieAttributes = { expires: 182 };

// this listing has a filename that we use to find the tile results
const TILESERVER_LISTING = `https://tileserver.cyclemaps.org/cyclemaps.listing?time=${Date.now()}`;
// this text gets replaced with the cyclemaps listing result in the openmaptiles style, the rest is used as-is (the protocol and the server)
const TILESERVER_REPLACE = 'cyclemaps.pmtiles';

export class MainControl implements IControl {
	private map: Map;
	private dummyContainer: HTMLElement | undefined;
	private static query = new URLSearchParams(window.location.search);

	public static async setup(container: string) {
		const mainControl = new MainControl(container, await MainControl.getStyle());	
		browserImport.setupImports(mainControl);
	}

	public constructor(container: string, style: string) {
		VectorTextProtocol.addProtocols(maplibregl); //this code includes our osm feature
		setWorkerUrl(new URL('./maplibre-gl-worker.mjs', import.meta.url).toString());
		const protocol = new Protocol();
		addProtocol("pmtiles",protocol.tile);
		
		const defaultLatitude = 40;
		const defaultLongitude = -96;
		const defaultZoom = 5;

		const latitude = +(Cookies.get('latitude') || defaultLatitude);
		const longitude = +(Cookies.get('longitude') || defaultLongitude);
		const zoom = +(Cookies.get('zoom') || defaultZoom);

		this.map = new Map({
			container,
			style,
			center: new LngLat(longitude, latitude),
			zoom: zoom,
			hash: true,
			canvasContextAttributes: {
				failIfMajorPerformanceCaveat: true,
			},
			dragRotate: false,
			attributionControl: false,
		});
		this.map.showTileBoundaries = MainControl.query.has('tile');
		this.map.addControl(new AttributionControl({
			customAttribution: 'maplibre', //data attribution comes from the input file
		}));
		this.map.addControl(this); //handles some click events
		this.map.addControl(new NavigationControl());
		this.map.addControl(new ScaleControl({}));
		this.map.addControl(new GeolocateControl({
			positionOptions: {enableHighAccuracy: true},
			trackUserLocation: true
		}));
		const buttonControl = new ButtonControl();
		this.map.addControl(buttonControl);
		this.map.addControl(new SaveControl(buttonControl));
		this.map.scrollZoom.setWheelZoomRate(4 / 450); //default is 1 / 450
	}

	public onAdd(map: Map) {
		this.dummyContainer = document.createElement('div');
		this.addMoveListener();
		this.addClickListeners();
		return this.dummyContainer;
	}
	
	public onRemove(map: Map) {
		this.dummyContainer!.parentNode!.removeChild(this.dummyContainer!);
	}
	
	private addMoveListener() {
		this.map.on('moveend', () => this.checkMove());
		this.checkMove();
		
		this.map.on('zoom', () => this.checkZoom());
		this.checkZoom();
	}
	
	private checkZoom() {
		const highZoomEnabled = this.map.getZoom() >= highZoom;
		const footLegend = document.getElementById('footLegend');
		if(footLegend === null) {
			return;
		}
		footLegend.style.opacity = (highZoomEnabled ? 1 : 0).toString();
	}
	
	private checkMove() {
		if(this.map.isMoving()) {
			return;
		}
		const latitude = this.map.getCenter().lat, longitude = this.map.getCenter().lng, zoom = this.map.getZoom();

		Cookies.set('latitude', latitude.toString(), cookieAttributes);
		Cookies.set('longitude', longitude.toString(), cookieAttributes);
		Cookies.set('zoom', zoom.toString(), cookieAttributes);
	}

	private addClickListeners() {
		this.map.on('mouseup', (event: MapMouseEvent) => {
			if(event.originalEvent.shiftKey) {
				alert(`point:  ${PointUtil.pointToString(event.lngLat, 4)}`);
			}
		});
		this.map.on('click', 'mtb_trail_feature', (event: MapLayerMouseEvent) => 
			new Popup({maxWidth: 'none'})
				.setLngLat(event.lngLat)
				.setHTML(MainControl.featureToDescription(event.features![0]))
				.addTo(this.map));
	}

	private static featureToDescription(feature: MapGeoJSONFeature) {
		const subclass = feature.properties.subclass;
		const location=feature.properties.location;
		let description = location !== 'yes' ? `The ${subclass} is on the ${location} of the trail` : `This is a ${subclass}`;
		const heightString=feature.properties.height;
		const heightActual: number | undefined = heightString !== undefined ? MainControl.parseLength(heightString) : undefined;
		if(heightActual !== undefined) {
			const height = heightActual <= 1 ? `${(heightActual*100).toFixed(0)}cm` : `${heightActual.toFixed(1)}m`
			description += `<br />\nThe height is ${height}`;
		}
		const bypass = feature.properties.bypass;
		if(bypass !== undefined && bypass !== 'no') {
			description += '<br />\n' + (bypass !== 'yes' ? `There is a bypass on the ${bypass} of the trail` : 'There is a bypass');
		}
		return description;
	}


	private static MILE = 1609.344; // exact definition
	private static YARD = MainControl.MILE/1760;  // exact definition
	private static FOOT = MainControl.MILE/5280; // exact definition
	private static INVERSE_FOOT = 1/MainControl.FOOT;
	private static INCH = MainControl.FOOT/12; // exact definition

	/**
	 * https://wiki.openstreetmap.org/wiki/Map_features/Units
	 * m km mi nmi '" yd
	 */
	private static parseLength(lengthString: string): number | undefined {
		lengthString=lengthString.trim();
		let match = lengthString.match(/^([\d.]+)$/);
		if(match !== null) {
			return +match[1];
		}
		match = lengthString.match(/^([\d.]+)\s*m$/);
		if(match !== null) {
			return +match[1];
		}
		match = lengthString.match(/^([\d.]+)\s*km$/);
		if(match !== null) {
			return +match[1] * 1000;
		}
		match = lengthString.match(/^([\d.]+)\s*mi$/);
		if(match !== null) {
			return +match[1] * MainControl.MILE;
		}
		match = lengthString.match(/^([\d.]+)\s*nmi$/);
		if(match !== null) {
			return +match[1] * 1852;
		}
		match = lengthString.match(/^([\d.]+)\s*'\s*([\d.]+)\s*"$/);
		if(match !== null) {
			return (+match[1] * 12 + +match[2]) * MainControl.INCH;
		}
		match = lengthString.match(/^([\d.]+)\s*yd$/);
		if(match !== null) {
			return +match[1] * MainControl.YARD;
		}
		console.error(`unexpected length ${lengthString}`);
		return undefined;
	}

	/*
	private static testParseLength() {
		console.log(MainControl.parseLength('3 m')! - 3);
		console.log(MainControl.parseLength('0.2 km')! - 200);
		console.log(MainControl.parseLength('1.45 mi')! - 2333.5488);
		console.log(MainControl.parseLength('6 nmi')! - 11112);
		console.log(MainControl.parseLength('12\'5"')! - 3.7846);
		console.log(MainControl.parseLength('40 yd')! - 36.576);
	}
	*/

	/**
	 * get the content of the style and modify it to have the "listing" filename in it
	 * 
	 * why do we even do this?
	 * 
	 * i am not sure.  there is probably a thing in pmtiles or maplibre that doesn't correctly notice when the pmtiles content changes.
	 * 
	 * replace this method call with just getStyleQuery() to test the normal behavior
	 */
	private static async getStyle(): Promise<string> {
		const listingFilename = (await FetchUtil.fetch(TILESERVER_LISTING)).trim();

		const data = await FetchUtil.fetchAndParse(this.getStyleQuery());
		data.sources.openmaptiles.url = data.sources.openmaptiles.url.replaceAll(TILESERVER_REPLACE, listingFilename);
		return data;
	}

	private static getStyleQuery() {
		const styleRoot = '';
		const cookieStyle = Cookies.get('style') || null;
		const style = MainControl.query.has('style') ? `style-${MainControl.query.get('style')}.json` : cookieStyle;

		
		if(style != null) {
			Cookies.set('style', style, cookieAttributes);
		}

		return styleRoot + (style != null && style != 'style-default.json' ? style : 'style.json');
	}

	public static getQuery(key: string): string | null {
		return MainControl.query.get(key);
	}
	
	public static getButtonsQuery() {
		const cookieButtons = Cookies.get('buttons') || null;
		const buttons = MainControl.query.has('buttons') ? MainControl.query.get('buttons') : cookieButtons;
		
		if(buttons != null) {
			Cookies.set('buttons', buttons, cookieAttributes);
		}

		return buttons != null ? buttons : 'buttons.json';
	}

	private openOsmEdit() {
		window.open(ExternalLinkButton.formatUrl(this.map!, 'https://www.openstreetmap.org/edit#map={z1}/{latitude}/{longitude}'));
	}
}

MainControl.setup('map').then(() => {});


