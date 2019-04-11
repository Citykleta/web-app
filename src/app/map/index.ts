import mapboxgl from 'mapbox-gl';
import mapBoxConf from '../../conf/mapbox';
import registry from '../services/service-registry';
import {
    slice as suggestionsSlicer,
    id as suggestionsId,
    style as suggestionsStyle,
} from './suggestions-layer';
import {
    id as stopsId,
    style as stopsStyle,
    slicer as stopsSlicer
} from './directions-stops-layer';
import {
    slicer as routesPathSlicer,
    getLayerData as getRoutesPathData,
    id as routesId,
    style as routesStyle
} from './directions-path-layer';
import {EMPTY_SOURCE, eventuallyUpdate, pointListToFeature} from './utils';

const {accessToken, ...rest} = mapBoxConf;
const {store} = registry;

mapboxgl.accessToken = accessToken;

const map = new mapboxgl.Map({
    container: 'map-container',
    interactive: true,
    ...rest
});

map.on('load', () => {
    map.addSource(suggestionsId, EMPTY_SOURCE);
    map.addLayer(suggestionsStyle);
    map.addSource(routesId, EMPTY_SOURCE);
    map.addLayer(routesStyle);
    map.addSource(stopsId, EMPTY_SOURCE);
    map.addLayer(stopsStyle);
});

let currentSelectedSuggestion = null;

const mapUpdater = eventuallyUpdate(map);
const updateSuggestions = mapUpdater(suggestionsId, suggestionsSlicer, pointListToFeature);
const updateStopPoints = mapUpdater(stopsId, stopsSlicer, pointListToFeature);
const updateRoutes = mapUpdater(routesId, routesPathSlicer, getRoutesPathData);

store.subscribe(() => {
    const newState = store.getState();
    const {selectedSuggestion} = newState.search;

    updateSuggestions(newState);
    updateStopPoints(newState);
    updateRoutes(newState);

    if (selectedSuggestion !== currentSelectedSuggestion && selectedSuggestion !== null) {
        map.flyTo({
            center: [selectedSuggestion.lng, selectedSuggestion.lat],
            zoom: 13.5
        });
    }
});




