import polyline from '@mapbox/polyline';
import {EMPTY_GEOJSON_SOURCE_DATA} from '@citykleta/mb-gl-comp';
import {decodeLine, GeoCoord, GeoJSONLineString, SearchResult} from '../utils';
import {createSearchResultInstance} from '../search/elements/search-result';
import {ApplicationState} from '../store/store';
import {View} from '../navigation/reducer';

// todo compare and do something with ./src/util.js
export const decodeLineString = geometry => {
    const output = Object.assign({}, geometry);
    output.coordinates = decodeLine(geometry.coordinates);
    return output;
};

export const pointListToFeature = (points: GeoCoord[]) => ({
    type: 'FeatureCollection',
    features: points.map(pointToFeature)
});

const pointFeatureFactory = (selectedItem: SearchResult) => (item: SearchResult, index ?: number) => ({
    type: 'Feature',
    geometry: createSearchResultInstance(item).toGeoFeature(),
    properties: Object.assign({
        selected: item === selectedItem,
        index
    }, item)
});

const pointToFeature = (point: GeoCoord) => ({
    type: 'Feature',
    geometry: {
        type: 'Point',
        coordinates: [point.lng, point.lat]
    }
});

export const suggestionsToGeoJSON = (state: ApplicationState) => {
    const data = state.search;
    if (data.searchResult.length === 0 && data.selectedSearchResult === null) {
        return EMPTY_GEOJSON_SOURCE_DATA;
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

export const leisureToGeoJSON = (state: ApplicationState) => {
    const {routes, selectedRouteId} = state.leisure;
    const {selectedView: view} = state.navigation;
    if (routes.length === 0 || selectedRouteId === null || view !== View.LEISURE) {
        return EMPTY_GEOJSON_SOURCE_DATA;
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
                    selected: state.leisure.selectedStopIndex === index,
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

export const itineraryToGeoJSON = (state: ApplicationState) => {
    const {routes, stops, selectedRoute} = state.itinerary;

    if (routes.length === 0) {
        return EMPTY_GEOJSON_SOURCE_DATA;
    }

    const lineFeatures = routes
        .map((r, index) => ({
            type: 'Feature',
            geometry: polyline.toGeoJSON(r.geometry, 5),
            properties: {
                selected: index === selectedRoute,
                index
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
