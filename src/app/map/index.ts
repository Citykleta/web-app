import mapboxgl from 'mapbox-gl';
import polyline from '@mapbox/polyline';
import mapBoxConf from '../../conf/mapbox';
import registry from '../services/service-registry';

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

    map.addLayer({
        id: 'suggestions',
        type: 'circle',
        source: 'suggestions',
        paint: {
            ['circle-color']: 'red'
        }
    });
});

let currentSuggestion = null;

store.subscribe(() => {
    const {suggestions, selectedSuggestion} = store.getState().search;

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

    if (selectedSuggestion !== currentSuggestion && selectedSuggestion !== null) {
        map.flyTo({
            center: [selectedSuggestion.lng, selectedSuggestion.lat],
            zoom: 15.5
        });
    }
    currentSuggestion = selectedSuggestion;

});




