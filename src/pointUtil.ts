

import { LngLat } from 'maplibre-gl';

export class PointUtil {
	public static pointToString(point: LngLat, accuracy: number = 5) {
		return `${point.lat.toFixed(accuracy)},${point.lng.toFixed(accuracy)}`;
	}
	public static reversedPointToString(point: LngLat, accuracy: number = 5) {
		return `${point.lng.toFixed(accuracy)},${point.lat.toFixed(accuracy)}`;
	}
}



