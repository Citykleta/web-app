import {ServiceRegistry} from '../services/service-registry';
import mapboxgl from 'mapbox-gl';
import {Events, ItineraryState} from '../services/store';
import polyline from '@mapbox/polyline';
import mapBoxConf from '../../conf/mapbox';

const EMPTY_SOURCE = Object.freeze({
    type: 'geojson',
    data: {
        type: 'FeatureCollection',
        features: []
    }
});

export const factory = (registry: ServiceRegistry) => {
    const {store, mapTools} = registry;
    const accessToken = mapBoxConf.token;
    const style = mapBoxConf.styleUrl;

    mapboxgl.accessToken = accessToken;

    const map = new mapboxgl.Map({
        container: 'map-container',
        style,
        center: [-82.367408, 23.122419],
        zoom: 12.4
    });

    store.on(Events.ITINERARY_STOPS_CHANGED, (state: ItineraryState) => {
        const features = [];
        for (const p of state.stops) {
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [p.lng, p.lat]
                }
            });
        }

        const geojson = {
            type: 'FeatureCollection',
            features
        };

        map.getSource('directions-stops').setData(geojson);
    });

    store.on(Events.ITINERARY_ROUTES_CHANGED, (state: ItineraryState) => {
        const {routes} = state;
        const newData = routes.length > 0 ? {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry: polyline.toGeoJSON(routes[0].geometry, 5)
            }]
        } : EMPTY_SOURCE.data;

        map.getSource('directions-path').setData(newData);
    });

    map.on('load', () => {

        map.addSource('directions-stops', EMPTY_SOURCE);

        map.addSource('directions-path', EMPTY_SOURCE);

        map.addLayer({
            id: 'directions-path',
            type: 'line',
            source: 'directions-path',
            paint: {
                'line-color': 'blue',
                'line-width': 7
            }
        });

        map.addLayer({
            id: 'directions-stops',
            type: 'circle',
            source: 'directions-stops',
            paint: {
                ['circle-color']: 'red'
            }
        });

        map.on('click', async ev => {
            const {lng, lat} = ev.lngLat;
            mapTools.actionClick({lng, lat});
        });
    });

    return map;
};
