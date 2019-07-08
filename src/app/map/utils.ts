import {ApplicationState} from '../store/store';
import {GeoCoord} from '../utils';

export const EMPTY_SOURCE = Object.freeze({
    type: 'geojson',
    data: {
        type: 'FeatureCollection',
        features: []
    }
});

export const eventuallyUpdate = map => (layer: string, slicer: Function, updateFunction: Function) => {
    let currentState = null;
    return (state: ApplicationState) => {
        let updated = false;
        const newState = slicer(state);
        if (currentState !== newState) {
            map.getSource(layer).setData(updateFunction(newState));
            updated = true;
        }
        currentState = newState;
        return updated;
    };
};

export const pointListToFeature = (points: GeoCoord[]) => ({
    type: 'FeatureCollection',
    features: points.map(pointToFeature)
});

const pointToFeature = (point: GeoCoord) => ({
    type: 'Feature',
    geometry: {
        type: 'Point',
        coordinates: [point.lng, point.lat]
    }
});
