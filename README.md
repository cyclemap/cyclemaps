
## lots of licenses

* see [cyclemaps.org](https://cyclemaps.org/) for the licenses
* [or the index here](/index.html)

### license for client-side

* [this license](LICENSE.md)
* [maplibre](https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt)
* [maplibre-gl-vector-text-protocol](https://github.com/jimmyrocks/maplibre-gl-vector-text-protocol/blob/main/LICENSE)
* [js-cookie](https://github.com/js-cookie/js-cookie/blob/master/LICENSE)

## domain name

* [cyclemaps.org](https://cyclemaps.org/)

## notes

* see about link for technologies, licensing, and thanks
* [our script to run tilemaker is here](https://github.com/cyclemap/tilemaker-config)

## first time setup

* you need to set environment variable `CYCLEMAPS_MAPBOX_PUBLIC_ACCESS_TOKEN`
* `echo "CYCLEMAPS_MAPBOX_PUBLIC_ACCESS_TOKEN=$CYCLEMAPS_MAPBOX_PUBLIC_ACCESS_TOKEN" >.env`
* `./update.sh`
* `./install.sh`
* `./build.sh`

## non server-side layers

### noaa layer notes

`curl https://mapservices.weather.noaa.gov/raster/rest/services/obs/rfc_qpe/MapServer/?f=json |jq`
 
* 1d = 25+3
* today = 29+3
* 2d = 33+3
* 3d = 37+3
* 4d = 41+3
* 5d = 45+3
* 6d = 49+3
* 7d = 53+3
* 10d = 57+3
* 14d = 61+3
* 30d = 65+3
* 60d = 69+3
* 90d = 73+3
* 120d = 77+3
* 180d = 81+3
* 365d = 85+3

