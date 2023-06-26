
import { LayerControl, CyclemapLayerSpecification } from './layer.js';

import { IControl, Map } from 'maplibre-gl';

const TILE_SIZE = 2048;

//layer ids found here:  curl https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/analysis_meteohydro_sfc_qpe_time/MapServer/?f=json |jq .
//also found here     :  curl https://mapservices.weather.noaa.gov/raster/rest/services/obs/rfc_qpe/MapServer/?f=json |jq .

interface LayerIdMap {
	[key: string]: number;
}

//const RAIN_PATH = 'https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/analysis_meteohydro_sfc_qpe_time/MapServer/export'; const LAYER_ID_MAP: LayerIdMap = {'1d': 19, '3d': 27};
const RAIN_PATH = 'https://mapservices.weather.noaa.gov/raster/rest/services/obs/rfc_qpe/MapServer/export'; const LAYER_ID_MAP: LayerIdMap = {'1d': 25+3, '3d': 37+3, '5d': 45+3};

//5 day and 7 day can be found here:  https://www.wpc.ncep.noaa.gov/qpf/p120i.gif  https://www.wpc.ncep.noaa.gov/qpf/p168i.gif

export class RainControl implements IControl {
	map: Map | undefined;
	layerControl: LayerControl;
	dummyContainer: HTMLElement | undefined;

	constructor(layerControl: LayerControl) {
		this.layerControl = layerControl;
	}

	onAdd(map: Map) {
		this.map = map;
		this.dummyContainer = document.createElement('div');
		map.on('style.load', (event: Event) => {
			this.addRainButtons();
		});
		map.on('load', (event: Event) => {
			this.addRainButtons();
		});
		return this.dummyContainer;
	}
	
	onRemove(map: Map) {
		this.dummyContainer!.parentNode!.removeChild(this.dummyContainer!);
		this.map = undefined;
	}
	
	addRainButtons() {
		for(let key in LAYER_ID_MAP) {
			this.addRainButton(key);
		}
	}

	addRainButton(key: string) {
		let layerId: number = LAYER_ID_MAP[key];

		this.layerControl.addLayerButton({
			"id": `rain-history-${key}`,
			"name": `rain ${key}`,
			"active": false,
			"type": "raster",
			"layout": {"visibility": "visible"},
			"paint": {"raster-opacity": 0.5},
			"beforeId": "rain-anchor",
			"onAddLayer": this.addRainLegend,
			"onRemoveLayer": this.removeRainLegend,
			"source": {
				"type": "raster",
				"tileSize": TILE_SIZE,
				"tiles" : [
					`${RAIN_PATH}?bbox={bbox-epsg-3857}&size=${TILE_SIZE/4},${TILE_SIZE/4}&dpi=96&format=png8&transparent=true&bboxSR=3857&imageSR=3857&layers=show:${layerId}&f=image`
				],
			},
		});
	}

	addRainLegend(layer: CyclemapLayerSpecification) {
		document.getElementById('rainLegend')!.style.visibility = 'visible';
	}

	removeRainLegend(layer: CyclemapLayerSpecification) {
		document.getElementById('rainLegend')!.style.visibility = 'hidden';
	}
}

