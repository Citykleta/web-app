import polyline from '@mapbox/polyline';
import {EMPTY_SOURCE} from '../utils';
import {Route} from '../../utils';
import {ApplicationState} from '../../store/store';

export const sourceId = 'directions-path';

export const lineStyle = {
    id: 'directions-line',
    type: 'line',
    source: sourceId,
    paint: {
        'line-color': 'blue',
        'line-width': 7
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

export const slicer = (state: ApplicationState) => state.itinerary.routes;

export const getLayerData = (routes: Route[]) => {

    if (routes.length === 0) {
        return EMPTY_SOURCE.data;
    }

    return {
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            geometry: polyline.toGeoJSON(routes[0].geometry, 5)
        }]
    };
};
