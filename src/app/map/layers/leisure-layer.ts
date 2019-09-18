import polyline from '@mapbox/polyline';
import {EMPTY_SOURCE} from '../utils';
import {ApplicationState} from '../../store/store';
import {LeisureState} from '../../leisure/reducer';
import {GeoJSONLineString} from '../../utils';
import {View} from '../../navigation/reducer';

export const sourceId = 'leisure-routes';

const activeColor = 'green';
export const lineStyle = {
    id: 'leisure-line',
    type: 'line',
    source: sourceId,
    paint: {
        'line-color': activeColor,
        'line-opacity': 1,
        'line-width': 5
    }
};

export const pointStyle = {
    id: 'leisure-point',
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
    id: 'leisure-label',
    type: 'symbol',
    source: sourceId,
    filter: ['==', '$type', 'Point'],
    layout: {
        'text-size': 18,
        'text-offset': [0, -0.4],
        'text-anchor': 'bottom',
        'text-font': ['Open Sans Bold'],
        'text-field': ['get', 'name'],
        visibility: 'visible'
    },
    paint: {
        'text-color': activeColor
    }
};

export const slicer = (state: ApplicationState) => Object.assign({}, state.leisure, {view: state.navigation.selectedView});

// todo a lot can be mutualized with routes
export const getLayerData = (state: LeisureState & { view: View }) => {

    const {routes, selectedRouteId, view} = state;

    if (routes.length === 0 || selectedRouteId === null || view !== View.LEISURE) {
        return EMPTY_SOURCE.data;
    }

    const selectedRoute = routes.find(r => r.id === selectedRouteId);
    const lineFeature = {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: polyline.decode((<GeoJSONLineString>selectedRoute.geometry).coordinates)
        }
    };

    const pointFeatures = selectedRoute.stops
        .map((p, index) => {
            return {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: p.geometry.coordinates
                },
                properties: {
                    index: index + 1,
                    name: p.name,
                    description: p.description
                }
            };
        });
    const features = [lineFeature, ...pointFeatures];
    return {
        type: 'FeatureCollection',
        features
    };
};
