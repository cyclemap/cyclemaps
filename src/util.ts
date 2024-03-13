

import { LngLat } from 'maplibre-gl';

export function pointToString(point: LngLat, accuracy: number = 5) {return `${point.lat.toFixed(accuracy)},${point.lng.toFixed(accuracy)}`;}
export function reversedPointToString(point: LngLat, accuracy: number = 5) {return `${point.lng.toFixed(accuracy)},${point.lat.toFixed(accuracy)}`;}

const CYCLEMAPS_MAPBOX_PUBLIC_ACCESS_TOKEN = process.env.CYCLEMAPS_MAPBOX_PUBLIC_ACCESS_TOKEN;

export function ajaxGet(url: string, callback: (data: any) => void) {
	fetch(url)
	.then(response => {
		if (!response.ok) {
			throw new Error(`http error. status: ${response.status}`);
		}

		return response.text();
	})
	.then(text => {
		if(CYCLEMAPS_MAPBOX_PUBLIC_ACCESS_TOKEN !== undefined) {
			text = text.replaceAll("{CYCLEMAPS_MAPBOX_PUBLIC_ACCESS_TOKEN}", CYCLEMAPS_MAPBOX_PUBLIC_ACCESS_TOKEN);
		}
		return JSON.parse(text);
	})
	.then(callback);
}


