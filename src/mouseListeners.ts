
import { MainControl } from './main';
import { PointUtil } from './pointUtil';
import { LengthUtil } from './lengthUtil';

import { Map, MapMouseEvent, LngLatLike, MapLibreEvent, MapLayerMouseEvent, MapGeoJSONFeature, Popup } from 'maplibre-gl';
import Cookies from 'js-cookie';

type ClassDetails = {
	prefix?: string, // default is "This is a"
	hasImage?: boolean, // default is false
};

export class MouseListeners {
	private readonly map: Map;
	private readonly tooltip: Popup;
	private tooltipPoint: LngLatLike | undefined = undefined;
	private openPopups: number = 0;
	
	private static readonly LAYER_IDS = ['bicycle', 'bicycle_parking', 'bicycle_rental', 'bicycle_repair_station', 'compressed_air', 'drinking_water', 'ford', 'mtb_trail_feature', 'toilets'];
	private static readonly SUBCLASS_DETAILS: {[layerId: string]: ClassDetails} = {
		'aframe': {prefix: 'This is an'},
		'bicycle': {},
		'bicycle-parking': {prefix: 'This is'},
		'bicycle-rental': {prefix: 'This is', hasImage: true},
		'bicycle-repair-station': {hasImage: true},
		'bridge': {hasImage: true},
		'compressed-air': {},
		'drinking-water': {prefix: 'This is', hasImage: true},
		'drop': {hasImage: true},
		'ford': {},
		'gap-jump': {hasImage: true},
		'jump': {hasImage: true},
		'skinny': {hasImage: true},
		'teeter': {hasImage: true},
		'toilets': {prefix: 'These are'},
		'wall-ride': {hasImage: true},
	};
	private static readonly HIGH_ZOOM = 12;


	public constructor(map: Map) {
		this.map = map;
		
		this.tooltip = new Popup({
			closeButton: false,
			closeOnClick: false,
			offset: 15,
			anchor: 'bottom-left',
		}).trackPointer();
	}
	
	public add() {
		const map = this.map;
		map.on('moveend', () => this.checkMove());
		this.checkMove();
		
		map.on('zoom', () => this.checkZoom());
		this.checkZoom();

		map.on('mouseup', (event: MapMouseEvent) => {
			if(event.originalEvent.shiftKey) {
				alert(`point:  ${PointUtil.pointToString(event.lngLat, 4)}`);
			}
		});
		

		map.on('click', MouseListeners.LAYER_IDS, (event: MapLayerMouseEvent) => {
			const popup = new Popup({maxWidth: 'none'})
				.setLngLat(MouseListeners.eventToPoint(event))
				.setHTML(MouseListeners.featureToDescription(event.features![0]));
			popup.on('open', () => {
				this.openPopups++;
				this.closeTooltip();
			});
			popup.on('close', () => {
				this.openPopups--;
			});
			popup.addTo(map);
		});

		map.on('mousemove', MouseListeners.LAYER_IDS, (event: MapLayerMouseEvent) => {
			if(this.openPopups > 0) {
				return;
			}
			const featurePoint = MouseListeners.eventToPoint(event);
			if (this.tooltipPoint !== featurePoint) {
				this.tooltipPoint = featurePoint;

				map.getCanvas().style.cursor = 'pointer';

				this.tooltip
					.setLngLat(featurePoint)
					.setHTML(MouseListeners.featureToTypename(event.features![0]))
					.addTo(map);
			}
		});

		map.on('mouseleave', MouseListeners.LAYER_IDS, () => {
			this.closeTooltip();
		});
	}

	private closeTooltip() {
		this.tooltipPoint = undefined;
		this.map.getCanvas().style.cursor = '';
		this.tooltip.remove();
	}

	private checkZoom() {
		const highZoomEnabled = this.map.getZoom() >= MouseListeners.HIGH_ZOOM;
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

		Cookies.set('latitude', latitude.toString(), MainControl.COOKIE_ATTRIBUTES);
		Cookies.set('longitude', longitude.toString(), MainControl.COOKIE_ATTRIBUTES);
		Cookies.set('zoom', zoom.toString(), MainControl.COOKIE_ATTRIBUTES);
	}

	/**
	 * if the event has a point feature, it'll use that
	 * 
	 * otherwise it uses the event point (which moves with the mouse)
	 */
	private static eventToPoint(event: MapLayerMouseEvent): LngLatLike {
		const feature = event.features![0];
		if(feature.geometry.type === 'Point') {
			return feature.geometry.coordinates as [number, number];
		}

		// use the event point
		return event.lngLat;
	}

	private static featureToTypename(feature: MapGeoJSONFeature) {
		const type = feature.properties.subclass
			.replaceAll('_', '-');
		if(type === 'bicycle') {
			return 'bicycle-shop';
		}
		return type;
	}
	private static getImageUrl(type: string): string | undefined {
		return MouseListeners.SUBCLASS_DETAILS[type]?.hasImage ? `/images/${type}-200.jpg` : undefined;
	}

	private static featureToDescription(feature: MapGeoJSONFeature) {
		const type = MouseListeners.featureToTypename(feature);
		const name = feature.properties['name:latin'] ?? feature.properties.name;
		
		const location=feature.properties.location !== 'yes' ? feature.properties.location : undefined;
		const bypass = feature.properties.bypass !== undefined && feature.properties.bypass !== 'no' ?
			feature.properties.bypass : undefined;

		const prefix = MouseListeners.SUBCLASS_DETAILS[type]?.prefix ?? 'This is a';
		let description = `${prefix} ${type.replaceAll('-', ' ')}<br />\n`;
		if(name !== undefined) {
			description += `${name}<br />\n`;
		}
		const imageUrl = MouseListeners.getImageUrl(type);
		if(imageUrl !== undefined) {
			description += `<img src="${imageUrl}" /><br />\n`;
		}
		description += `<br />\n`;

		const heightString=feature.properties.height;
		const heightActual: number | undefined = heightString !== undefined ? LengthUtil.parseLength(heightString) : undefined;
		if(heightActual !== undefined) {
			const height = heightActual <= 1 ? `${(heightActual*100).toFixed(0)}cm` : `${heightActual.toFixed(1)}m`
			description += `The height is ${height}<br />\n`;
		}
		if(location !== undefined || bypass !== undefined) {
			description += `(`;
			if(location !== undefined) {description += `It is on the ${location} of the trail`;}
			if(location !== undefined && bypass !== undefined) {
				description += '. ';
			}
			if(bypass !== undefined) {description += `It can be bypassed`;}
			description += `)<br />\n`;
		}
		return description;
	}
}

