

import { LngLat } from 'maplibre-gl';

export function pointToString(point: LngLat, accuracy: number = 5) {return `${point.lat.toFixed(accuracy)},${point.lng.toFixed(accuracy)}`;}
export function reversedPointToString(point: LngLat, accuracy: number = 5) {return `${point.lng.toFixed(accuracy)},${point.lat.toFixed(accuracy)}`;}


export function ajaxGet(url: string, callback: (data: any) => void) {
	let xhttp = new XMLHttpRequest();
	xhttp.addEventListener("load", function() {
		if(this.status !== 200) {
			console.error(`did not get ${url}: error ${this.statusText}`);
			return;
		}
		let returnValue = JSON.parse(this.responseText);
		if(returnValue.error) {
			if(returnValue.error.message) {
				console.error(`did not get ${url}: error ${returnValue.error.message}`);
				return;
			}
			console.error(`did not get ${url}: error ${returnValue.error}`);
			return;
		}
		callback(returnValue);
	});
	xhttp.addEventListener("error", function() {console.error(`did not get ${url}: error ${this.statusText}`);});
	xhttp.open("GET", url, true);
	xhttp.send();
}


