import polyline from '@mapbox/polyline';
import {EMPTY_SOURCE} from './utils';
import {Route} from '../util';
import {ApplicationState} from '../services/store';

export const id = 'directions-path';

export const style = {
    id,
    type: 'line',
    source: id,
    paint: {
        'line-color': 'blue',
        'line-width': 7
    }
};

export const slicer = (state:ApplicationState) => state.itinerary.routes;

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
