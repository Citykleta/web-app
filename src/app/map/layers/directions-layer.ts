import polyline from '@mapbox/polyline';
import {EMPTY_SOURCE} from '../utils';
import {ApplicationState} from '../../store/store';
import {ItineraryState} from '../../itinerary/reducer';
import {createSearchResultInstance} from '../../search/elements/search-result';

export const sourceId = 'directions-path';

const activeColor = '#ff426f';
export const lineStyle = {
    id: 'directions-line',
    type: 'line',
    source: sourceId,
    paint: {
        'line-color': ['case', ['get', 'selected'], activeColor, 'gray'],
        'line-opacity': ['case', ['get', 'selected'], 1, 0.6],
        'line-gap-width': ['case', ['get', 'selected'], 2, 0],
        'line-width': ['case', ['get', 'selected'], 3, 5]
    }
};

export const pointStyle = {
    id: 'directions-point',
    type: 'circle',
    source: sourceId,
    filter: ['==', '$type', 'Point'],
    paint: {
        'circle-color': activeColor,
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': activeColor,
        'circle-opacity': 0.2
    }
};

export const labelStyle = {
    id: 'directions-label',
    type: 'symbol',
    source: sourceId,
    filter: ['==', '$type', 'Point'],
    layout: {
        'text-size': 22,
        'text-offset': [0, -0.4],
        'text-anchor': 'bottom',
        'text-font': ['Open Sans Bold'],
        'text-field': ['get', 'index'],
        visibility: 'visible'
    },
    paint: {
        'text-color': activeColor
    }
};

export const slicer = (state: ApplicationState) => state.itinerary;

export const getLayerData = (state: ItineraryState) => {

    const {routes, stops, selectedRoute} = state;

    if (routes.length === 0) {
        return EMPTY_SOURCE.data;
    }

    const lineFeatures = routes
        .map((r, i) => ({
            type: 'Feature',
            geometry: polyline.toGeoJSON(r.geometry, 5),
            properties: {
                selected: i === selectedRoute
            }
        }));

    const pointFeatures = stops
        .filter(p => p.item !== null)
        .map(p => createSearchResultInstance(p.item)
            .toPoint())
        .map((p, index) => {
            return {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [p.lng, p.lat]
                },
                properties: {
                    index: index + 1
                }
            };
        });

    const features = [...lineFeatures, ...pointFeatures];

    return {
        type: 'FeatureCollection',
        features
    };
};
