import {EMPTY_SOURCE} from './utils';
import {ApplicationState} from '../services/store';
import {decodeLine, SearchResult} from '../utils';
import {SearchState} from '../reducers/search';
import {createSearchResultInstance} from '../elements/search/search-result';

export const sourceId = 'suggestions';

export const lineStyle = {
    id: 'suggestions-line',
    type: 'line',
    source: sourceId,
    paint: {
        'line-color': ['case', ['get', 'selected'], '#55b2ff', '#ff426f'],
        'line-opacity': 0.7,
        'line-gap-width': ['case', ['get', 'selected'], 4, 1],
        'line-width': ['case', ['get', 'selected'], 7, 5]
    }
};

export const pointStyle = {
    id: 'suggestions-point',
    type: 'circle',
    source: sourceId,
    paint: {
        'circle-color': '#55b2ff',
        'circle-radius': 12,
        'circle-stroke-width': ['case', ['get', 'selected'], 4, 2],
        'circle-stroke-color': ['case', ['get', 'selected'], '#55b2ff', '#ff426f'],
        'circle-opacity': 0.2,
    },
    filter: ['==', '$type', 'Point']
};

export const slicer = (state: ApplicationState) => state.search;

export const decodeLineString = geometry => {
    const output = Object.assign({}, geometry);
    output.coordinates = decodeLine(geometry.coordinates);
    return output;
};

const pointFeatureFactory = (selectedItem: SearchResult) => (item: SearchResult, index ?: number) => ({
    type: 'Feature',
    geometry: createSearchResultInstance(item).toGeoFeature(),
    properties: {
        selected: item === selectedItem,
        index
    }
});

export const getLayerData = (data: SearchState) => {

    if (data.searchResult.length === 0 && data.selectedSearchResult === null) {
        return EMPTY_SOURCE.data;
    }

    const pointFactory = pointFeatureFactory(data.selectedSearchResult);

    const geoJSON = {
        type: 'FeatureCollection',
        features: data.searchResult
            .map(pointFactory)
    };

    if (data.selectedSearchResult && geoJSON.features.every(f => f.properties.selected === false)) {
        geoJSON.features.push(pointFactory(data.selectedSearchResult));
    }

    return geoJSON;
};
