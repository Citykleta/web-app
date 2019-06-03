import mapboxgl from 'mapbox-gl';
import mapBoxConf from '../../conf/mapbox';
import registry from '../services/service-registry';
import {
    getLayerData as getRoutesPathData,
    lineStyle as routeLineStyle,
    slicer as routesPathSlicer,
    sourceId as routesId
} from './directions-layer';
import {
    getLayerData as getAddressLineData,
    lineStyle as suggestionsLineStyle,
    pointStyle as suggestionsPointLayer,
    slicer as suggestionsSlicer,
    sourceId as suggestionsSourceId
} from './suggestions-layer';
import {EMPTY_SOURCE, eventuallyUpdate} from './utils';
import {createSearchResultInstance} from '../elements/search-result/entities';

const {accessToken, ...rest} = mapBoxConf;
const {store} = registry;

mapboxgl.accessToken = accessToken;

const map = new mapboxgl.Map({
    container: 'map-container',
    interactive: true,
    ...rest
});

map.on('load', () => {
    map.addSource(routesId, EMPTY_SOURCE);
    map.addLayer(routeLineStyle);
    map.addSource(suggestionsSourceId, EMPTY_SOURCE);
    map.addLayer(suggestionsLineStyle);
    map.addLayer(suggestionsPointLayer);
});

map.on('click', ev => {
    console.log(ev.lngLat);
});


const mapUpdater = eventuallyUpdate(map);
const updateRoutes = mapUpdater(routesId, routesPathSlicer, getRoutesPathData);
const updateSuggestions = mapUpdater(suggestionsSourceId, suggestionsSlicer, getAddressLineData);

store.subscribe(() => {
    const newState = store.getState();
    const {selectedSearchResult} = newState.search;

    updateRoutes(newState);
    updateSuggestions(newState);

    if (selectedSearchResult !== null) {
        const center = createSearchResultInstance(selectedSearchResult).center();
        map.jumpTo({
            center: [center.lng, center.lat],
            zoom: Math.max(13.5, map.getZoom())
        });
    }
});




