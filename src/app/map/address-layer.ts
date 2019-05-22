import polyline from '@mapbox/polyline';
import {EMPTY_SOURCE} from './utils';
import {ApplicationState} from '../services/store';

export const id = 'address-line';

export const lineStyle = {
    id,
    type: 'line',
    source: id,
    paint: {
        'line-color': 'green',
        'line-opacity': 0.5,
        'line-width': 5
    }
};

export const pointStyle = {
    id: 'address-point',
    type: 'circle',
    source: id,
    paint: {
        'circle-color': 'green',
    }
};

export const slicer = (state: ApplicationState) => state.search.searchResult;


const decodeLineString = geometry => {
    const output = Object.assign({}, geometry);
    output.coordinates = polyline
        .decode(geometry.coordinates)
        .map(pair => pair.reverse());
    return output;
};

export const searchFeatureToGeoJSON = (data: any) => {

    switch (data.type) {
        case 'corner': {
            return data.geometry;
        }
        case 'street': {
            return decodeLineString(data.geometry);
        }
        case 'street_block': {
            return decodeLineString(data.geometry);
        }
    }
};

export const getLayerData = (data: any[] = []) => {

    if (data.length === 0) {
        return EMPTY_SOURCE.data;
    }

    return {
        type: 'FeatureCollection',
        features: data
            .map(item => ({
                type: 'Feature',
                geometry: searchFeatureToGeoJSON(item)
            }))
    };
};
