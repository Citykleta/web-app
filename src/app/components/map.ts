import {ServiceRegistry} from '../services/service-registry';
import mapboxgl from 'mapbox-gl';
import {Events, ItineraryState} from '../services/store';

export const factory = (registry: ServiceRegistry) => {
    const {store, mapTools} = registry;
    const accessToken = 'pk.eyJ1IjoibG9yZW56b2ZveCIsImEiOiJjanFwYWs3NXAyeG94NDhxanE5NHJodDZvIn0.hSLz7F4CLkY5jOdnf03PEw';
    const style = 'http://localhost:8080/styles/klokantech-basic/style.json';

    mapboxgl.accessToken = accessToken;

    const map = new mapboxgl.Map({
        container: 'map-container',
        style,
        center: [-82.367408, 23.122419],
        zoom: 12.4
    });

    store.on(Events.ITINERARY_STOP_CHANGED, (state: ItineraryState) => {
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

        console.log(geojson);

        map.getSource('directions-stops').setData(geojson);
    });

    map.on('load', () => {

        map.addSource('directions-stops', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
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
