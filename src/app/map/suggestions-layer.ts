import {EMPTY_SOURCE} from './utils';
import {ApplicationState} from '../services/store';
import {decodeLine} from '../utils';

export const sourceId = 'suggestions';

export const lineStyle = {
    id: 'suggestions-line',
    type: 'line',
    source: sourceId,
    paint: {
        'line-color': 'green',
        'line-opacity': 0.5,
        'line-width': 5
    }
};

export const pointStyle = {
    id: 'suggestions-point',
    type: 'circle',
    source: sourceId,
    paint: {
        'circle-color': 'green',
    }
};

export const slicer = (state: ApplicationState) => state.search.searchResult;

export const decodeLineString = geometry => {
    const output = Object.assign({}, geometry);
    output.coordinates = decodeLine(geometry.coordinates);
    return output;
};

// todo mutualize with search-result interface
export const searchFeatureToGeoJSON = (data: any) => {
    switch (data.type) {
        case 'lng_lat':
            return {
                type: 'Point',
                coordinates: [data.lng, data.lat]
            };
        case 'point_of_interest':
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
