import {ApplicationState} from '../store/store';
import {Store} from 'redux';
import * as mapboxglNamespace from 'mapbox-gl';
import {truncate} from '../utils';
import {updateMapPosition} from './actions';
import {EMPTY_SOURCE, eventuallyUpdate} from './utils';
import {
    getLayerData as getRoutesPathData,
    lineStyle as routeLineStyle,
    slicer as routesPathSlicer,
    sourceId as routesId
} from './layers/directions-layer';
import {
    getLayerData as getSuggestionsData,
    lineStyle as suggestionsLineStyle,
    pointStyle as suggestionsPointLayer,
    slicer as suggestionsSlicer,
    sourceId as suggestionsSourceId
} from './layers/suggestions-layer';
import mapboxConf from '../../conf/mapbox';
import {createSearchResultInstance} from '../search/elements/search-result';

/**
 * This service is a bit particular as it holds dom reference (through the mapbox instance)
 * Its role is to provide a narrowed interface to the map component provided by Mapbox.
 * It also keeps in sync the store state and therefore bypass a little bit the unidirectional data flow.
 * It is indeed not necessary to re-implement the whole mapbox API with redux actions and so.
 *
 * However this service allows to make the process transparent to the rest of the application
 */

// todo again some imcomp between typescript and rollup
// @ts-ignore
const {default: mapboxgl} = mapboxglNamespace;

export interface MapService {
    boot(opts: any): this;

    hasBooted(): boolean;

    getCenter(): number[];

    getZoom(): number;

    addSource(id: string, source: mapboxgl.GeoJSONSourceRaw): this;

    getSource(layer: string): mapboxgl.GeoJSONSourceRaw

    addLayer(layer: mapboxgl.Layer, before ?: string): this;

    onLoad(listener: (ev: any) => any): this;

    onClick(listener: (ev: any) => any): this;

    onClick(layer: string, listener: (ev: any) => any): this;

    jumpTo(options: mapboxgl.CameraOptions, eventData?: mapboxgl.EventData): this;
}

const mapActions = {
    updateMapPosition: updateMapPosition
};

export const provider = (store: Store<ApplicationState>, {
    updateMapPosition
} = mapActions): MapService => {
    let map;
    let hasBooted = false;
    let currentlySelectedSuggestion = null;

    const updateMapState = ev => {
        const zoom = truncate(map.getZoom(), 2);
        const {lng, lat} = map.getCenter();
        store.dispatch(updateMapPosition({
            zoom,
            center: [truncate(lng), truncate(lat)]
        }));
    };

    const instance: MapService = {

        boot(options) {

            if (hasBooted) {
                throw new Error('map service has already booted');
            }

            mapboxgl.accessToken = mapboxConf.accessToken;

            map = new mapboxgl.Map(Object.assign({}, mapboxConf, options));

            this.onLoad(() => {

                // // @ts-ignore
                map.addSource(routesId, EMPTY_SOURCE);
                // @ts-ignore
                map.addSource(suggestionsSourceId, EMPTY_SOURCE);
                // @ts-ignore
                map.addLayer(routeLineStyle);
                // @ts-ignore
                map.addLayer(suggestionsLineStyle);
                // @ts-ignore
                map.addLayer(suggestionsPointLayer);

                const mapUpdater = eventuallyUpdate(map);
                const updateRoutes = mapUpdater(routesId, routesPathSlicer, getRoutesPathData);
                const updateSuggestions = mapUpdater(suggestionsSourceId, suggestionsSlicer, getSuggestionsData);

                const updateMap = () => {
                    const newState = store.getState();
                    const {selectedSearchResult} = newState.search;
                    updateRoutes(newState);
                    updateSuggestions(newState);

                    if (selectedSearchResult !== null && currentlySelectedSuggestion !== selectedSearchResult) {
                        currentlySelectedSuggestion = selectedSearchResult;
                        const center = createSearchResultInstance(selectedSearchResult).toPoint();
                        instance.jumpTo({
                            center: [center.lng, center.lat]
                        });
                    }
                };

                store.subscribe(updateMap);

                // simply sync the store state.
                // todo check if we can't simply register to other event ?
                // on render does not seem to fit as:
                // 1- they are too many so we need to debounce
                // 2- looks like it is emitted whenever a feature is rendered, so the last one may occur quite a long time after the actual action has finished
                // map.on('render', ev => console.log(ev));
                map.on('zoomend', updateMapState);
                map.on('dragend', updateMapState);

                updateMap();
                hasBooted = true;
            });
            return this;
        },

        hasBooted() {
            return hasBooted;
        },

        addSource(id: string, source: mapboxgl.GeoJSONSourceRaw) {
            map.addSource(id, source);
            return this;
        },

        getSource(layer: string) {
            return map.getSource(layer);
        },

        addLayer(layer: mapboxgl.Layer, before?: string) {
            map.addLayer(layer, before);
            return this;
        },

        onLoad(listener) {
            map.on('load', listener);
            return this;
        },

        //todo
        // @ts-ignore
        onClick(layerOrListener: string | ((ev: any) => any), listener) {
            if (typeof layerOrListener === 'function') {
                map.on('click', <(ev) => any>layerOrListener);
            } else {
                map.on('click', layerOrListener, listener);
            }
            return this;
        },

        getZoom() {
            return store.getState().map.zoom;
        },

        getCenter() {
            return store.getState().map.center;
        },

        jumpTo(options: mapboxgl.CameraOptions, eventData?: mapboxgl.EventData) {
            map.jumpTo(Object.assign({zoom: Math.max(15.5, map.getZoom())}, options), eventData);
            // todo same than above, try to centralize event listener
            updateMapState(null);
            return this;
        }
    };

    return instance;
};
