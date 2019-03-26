import mapboxgl from 'mapbox-gl';
import polyline from '@mapbox/polyline';
import mapBoxConf from '../../conf/mapbox';
import registry from '../services/service-registry';
import {GeoCoord, isGeoCoord} from '../util';

const {accessToken, ...rest} = mapBoxConf;

mapboxgl.accessToken = accessToken;

const {store} = registry;

const EMPTY_SOURCE = Object.freeze({
    type: 'geojson',
    data: {
        type: 'FeatureCollection',
        features: []
    }
});

const map = new mapboxgl.Map({
    container: 'map-container',
    interactive: true,
    ...rest
});


map.on('load', () => {
    map.addSource('suggestions', EMPTY_SOURCE);
    map.addSource('directions-stops', EMPTY_SOURCE);
    map.addSource('directions-path', EMPTY_SOURCE);

    map.addLayer({
        id: 'suggestions',
        type: 'circle',
        source: 'suggestions',
        paint: {
            ['circle-color']: 'red'
        }
    });

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
            'circle-color': 'orange'
        }
    });
});

let currentSelectedSuggestion = null;
let currentSuggestionsList = null;
let currentStopsList = null;
let currentRoutes = null;

store.subscribe(() => {
    const {suggestions, selectedSuggestion} = store.getState().search;
    const {routes, stops} = store.getState().itinerary;

    if (suggestions !== currentSuggestionsList) {
        const features = [];
        for (const p of suggestions) {
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [p.lng, p.lat]
                }
            });
        }

        map.getSource('suggestions').setData({
            type: 'FeatureCollection',
            features
        });
    }

    if (stops !== currentStopsList) {
        const features = [];
        // @ts-ignore
        const points: GeoCoord[] = stops.filter(isGeoCoord);
        for (const p of points) {
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [p.lng, p.lat]
                }
            });
        }

        map.getSource('directions-stops').setData({
            type: 'FeatureCollection',
            features
        });
    }

    if (routes !== currentRoutes) {
        const newData = routes.length > 0 ? {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry: polyline.toGeoJSON(routes[0].geometry, 5)
            }]
        } : EMPTY_SOURCE.data;

        map.getSource('directions-path').setData(newData);
    }

    if (selectedSuggestion !== currentSelectedSuggestion && selectedSuggestion !== null) {
        map.flyTo({
            center: [selectedSuggestion.lng, selectedSuggestion.lat],
            zoom: 15.5
        });
    }
    currentSelectedSuggestion = selectedSuggestion;
    currentRoutes = routes;
    currentStopsList = stops;
    currentSuggestionsList = suggestions;
});




