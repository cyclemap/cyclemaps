
import { ButtonControl, ExternalLinkButton } from './button';
import { SaveControl } from './save';
import { MouseListeners } from './mouseListeners';
import { FetchUtil } from './fetchUtil';
import * as browserImport from './browserImport';

import { Protocol } from "pmtiles";
import Cookies from 'js-cookie';
import VectorTextProtocol from 'maplibre-gl-vector-text-protocol';
import * as maplibregl from 'maplibre-gl';
import { addProtocol, AttributionControl, IControl, LngLat, Map, NavigationControl, ScaleControl, GeolocateControl, setWorkerUrl } from 'maplibre-gl';
import { Point } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css'; // see globals.d.ts for where this is included in the output

export class MainControl implements IControl {
	private readonly map: Map;
	private readonly mouseListeners: MouseListeners;
	private dummyContainer: HTMLElement | undefined;
	private static query = new URLSearchParams(window.location.search);

	public static readonly COOKIE_ATTRIBUTES: Cookies.CookieAttributes = { expires: 182 };

	// this listing has a filename that we use to find the tile results
	private static readonly TILESERVER_LISTING = `https://tileserver.cyclemaps.org/cyclemaps.listing?time=${Date.now()}`;
	// this text gets replaced with the cyclemaps listing result in the openmaptiles style, the rest is used as-is (the protocol and the server)
	private static readonly TILESERVER_REPLACE = 'cyclemaps.pmtiles';


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
			minZoom: 2,
			hash: true,
			canvasContextAttributes: {
				failIfMajorPerformanceCaveat: true,
			},
			dragRotate: false,
			attributionControl: false,
		});
		this.mouseListeners = new MouseListeners(this.map);
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
		this.mouseListeners.add();
		return this.dummyContainer;
	}
	
	public onRemove(map: Map) {
		this.dummyContainer!.parentNode!.removeChild(this.dummyContainer!);
	}
	

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
		const listingFilename = (await FetchUtil.fetch(MainControl.TILESERVER_LISTING)).trim();

		const data = await FetchUtil.fetchAndParse(this.getStyleQuery());
		data.sources.openmaptiles.url = data.sources.openmaptiles.url.replaceAll(MainControl.TILESERVER_REPLACE, listingFilename);
		return data;
	}

	private static getStyleQuery() {
		const styleRoot = '';
		const cookieStyle = Cookies.get('style') || null;
		const style = MainControl.query.has('style') ? `style-${MainControl.query.get('style')}.json` : cookieStyle;

		
		if(style != null) {
			Cookies.set('style', style, MainControl.COOKIE_ATTRIBUTES);
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
			Cookies.set('buttons', buttons, MainControl.COOKIE_ATTRIBUTES);
		}

		return buttons != null ? buttons : 'buttons.json';
	}

	private openOsmEdit() {
		window.open(ExternalLinkButton.formatUrl(this.map!, 'https://www.openstreetmap.org/edit#map={z1}/{latitude}/{longitude}'));
	}
}

MainControl.setup('map').then(() => {});


