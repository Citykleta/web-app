import polyline from '@mapbox/polyline';
import {EMPTY_SOURCE} from '../utils';
import {ApplicationState} from '../../store/store';
import {ItineraryState} from '../../itinerary/reducer';

export const sourceId = 'directions-path';

export const lineStyle = {
    id: 'directions-line',
    type: 'line',
    source: sourceId,
    paint: {
        'line-color': ['case', ['get', 'selected'], '#ff426f', 'gray'],
        'line-opacity': ['case', ['get', 'selected'], 1, 0.6],
        'line-gap-width': ['case', ['get', 'selected'], 2, 0],
        'line-width': ['case', ['get', 'selected'], 3, 5]
    }
};

export const pointStyle = {
    id: 'directions-point',
    type: 'circle',
    source: sourceId,
    paint: {
        'circle-color': 'blue'
    }
};

export const slicer = (state: ApplicationState) => state.itinerary;

export const getLayerData = (state: ItineraryState) => {

    const {routes, selectedRoute} = state;

    if (routes.length === 0) {
        return EMPTY_SOURCE.data;
    }

    return {
        type: 'FeatureCollection',
        features: routes.map((r, i) => ({
            type: 'Feature',
            geometry: polyline.toGeoJSON(r.geometry, 5),
            properties: {
                selected: i === selectedRoute
            }
        }))
    };
};
