import { H as mapboxconf, V as View, J as suggestionsToGeoJSON, K as itineraryToGeoJSON, L as leisureToGeoJSON, M as reducer, N as GeoMap$1, O as GeoJSONSource, P as CircleLayer, Q as LineLayer, S as SymbolLayer, c as connect, s as store } from './index-edf8c9d7.js';
import { m as createGeoCoord, L as LitElement, h as html, o as once } from './utils-4526794e.js';
import { u as updateMapPosition, d as defaultRegistry, a as defaultInjector } from './index-a4db3c48.js';

const mapActions = {
    updateMapPosition: updateMapPosition
};
const provider = (store, { updateMapPosition } = mapActions) => {
    return {
        updateCamera(state) {
            store.dispatch(updateMapPosition(state));
        }
    };
};

const factory = () => {
    const toolBox = new Map();
    let currentTool = null;
    return {
        selectTool(view) {
            currentTool = toolBox.get(view);
            return this;
        },
        addTool(view, tool) {
            toolBox.set(view, tool);
            return this;
        },
        async clickAction(ev) {
            if (currentTool && typeof currentTool.clickAction === 'function') {
                currentTool.clickAction(ev);
            }
        },
        async longClickAction(ev) {
            if (currentTool && typeof currentTool.longClickAction === 'function') {
                currentTool.longClickAction(ev);
            }
        }
    };
};

const emitter = () => {
    const listenersLists = {};
    const instance = {
        on(event, ...listeners) {
            listenersLists[event] = (listenersLists[event] || []).concat(listeners);
            return instance;
        },
        dispatch(event, ...args) {
            const listeners = listenersLists[event] || [];
            for (const listener of listeners) {
                listener(...args);
            }
            return instance;
        },
        off(event, ...listeners) {
            if (event === undefined) {
                Object.keys(listenersLists).forEach(ev => instance.off(ev));
            }
            else {
                const list = listenersLists[event] || [];
                listenersLists[event] = listeners.length ? list.filter(listener => !listeners.includes(listener)) : [];
            }
            return instance;
        }
    };
    return instance;
};
const proxyListener = (eventMap) => ({ emitter }) => {
    const eventListeners = {};
    const proxy = {
        off(ev) {
            if (!ev) {
                Object.keys(eventListeners).forEach(eventName => proxy.off(eventName));
            }
            if (eventListeners[ev]) {
                emitter.off(ev, ...eventListeners[ev]);
            }
            return proxy;
        }
    };
    for (const ev of Object.keys(eventMap)) {
        const method = eventMap[ev];
        eventListeners[ev] = [];
        proxy[method] = function (...listeners) {
            eventListeners[ev] = eventListeners[ev].concat(listeners);
            emitter.on(ev, ...listeners);
            return proxy;
        };
    }
    return proxy;
};

const LONG_PRESS_TIME = 300;
const isSameLocation = (pos1, pos2) => {
    return pos1.lat === pos2.lat && pos1.lng === pos2.lng;
};
const factory$1 = (source) => {
    let mouseDownTime = null;
    let mouseDownPosition = null;
    const proxy = emitter();
    const proxyFactory = proxyListener({
        ["CLICK_EVENT" /* CLICK_EVENT */]: 'onClick',
        ["LONG_CLICK_EVENT" /* LONG_CLICK_EVENT */]: 'onLongClick'
    });
    //@ts-ignore
    const instance = proxyFactory({ emitter: proxy });
    //@ts-ignore
    source.addEventListener('mousedown', (ev) => {
        mouseDownTime = Date.now();
        mouseDownPosition = ev.lngLat;
    });
    //@ts-ignore
    source.addEventListener('mouseup', (ev) => {
        try {
            const mouseUpTime = Date.now();
            if (isSameLocation(mouseDownPosition, ev.lngLat)) {
                const eventName = (mouseUpTime - mouseDownTime) < LONG_PRESS_TIME ?
                    "CLICK_EVENT" /* CLICK_EVENT */ :
                    "LONG_CLICK_EVENT" /* LONG_CLICK_EVENT */;
                proxy.dispatch(eventName, ev);
            }
        }
        catch (e) {
            console.error(e);
        }
        finally {
            mouseDownTime = null;
            mouseDownPosition = null;
        }
    });
    return instance;
};

const searchViewTool = (registry) => {
    return {
        async clickAction(ev) {
            const searchService = registry.get('search');
            const { result } = await searchService.searchPointOfInterestNearBy(ev.lngLat);
            if (result.length) {
                searchService.selectSearchResult(result[0]);
            }
        },
        async longClickAction(ev) {
            const searchService = registry.get('search');
            searchService.searchPointOfInterest('');
            searchService.selectSearchResult(createGeoCoord(ev.lngLat.lng, ev.lngLat.lat));
        }
    };
};

const ACCESS_TOKEN = mapboxconf.accessToken;
const STYLE_URL = mapboxconf.style;
const template = ({ zoom, center, suggestions, itinerary, leisure, onCameraChange, selectSuggestion, selectItineraryRoute }) => {
    return html `
<mb-map @camera-change="${onCameraChange}" center="${center.join(',')}" zoom="${zoom}" access-token="${ACCESS_TOKEN}" mb-style="${STYLE_URL}">
    <mb-geojson .data="${suggestions}" source-id="suggestions">
        <mb-circle-layer @click="${selectSuggestion}" layer-id="suggestions-point"
            filter="['==','$type','Point']"
            circle-color="#55B2FF" 
            circle-radius="8"
            circle-stroke-width="['case',['get','selected'],4,2]" 
            circle-stroke-color="['case',['get','selected'],'#55b2ff','#ff426f']" 
            circle-opacity="0.2"></mb-circle-layer>
        <mb-line-layer @click="${selectSuggestion}" layer-id="suggestions-line"
            line-color="['case',['get','selected'],'#55b2ff','#ff426f']"
            line-opacity="0.7"
            line-gap-width="['case',['get','selected'],4,1]"
            line-width="['case',['get','selected'],7,5]"></mb-line-layer>
    </mb-geojson>
    <mb-geojson .data="${leisure}" source-id="leisure">
        <mb-circle-layer  layer-id="leisure-point"
            filter="['==','$type','Point']"
            circle-color="green"
            circle-radius="8"
            circle-stroke-width="2"
            circle-stroke-color="green"
            circle-opacity="0.2"></mb-circle-layer>
        <mb-line-layer  layer-id="leisure-line"
            line-color="green"
            line-opacity="1"
            line-width="5"></mb-line-layer>
        <mb-symbol-layer  layer-id="leisure-label"
            filter="['==','$type','Point']"
            text-size="18"
            text-offset="[0, -0.4]"
            text-anchor="bottom"
            text-font="['Open Sans Bold']"
            text-field="['get', 'name']"
            text-color="green"></mb-symbol-layer>
    </mb-geojson>
    <mb-geojson .data="${itinerary}" source-id="itinerary">
        <mb-line-layer @click="${selectItineraryRoute}" layer-id="itinerary-line"
            line-color="['case',['get','selected'],'#ff426f','gray']"
            line-opacity="['case',['get','selected'],1,0.6]"
            line-gap-width="['case',['get','selected'],2,0]"
            line-width="['case',['get','selected'],3,5]"></mb-line-layer>
        <mb-circle-layer source="itinerary" layer-id="itinerary-point"
            filter="['==','$type','Point']"
            circle-color="#ff426f"
            circle-radius="8"
            circle-stroke-width="2"
            circle-stroke-color="#ff426f"
            circle-opacity="0.2"></mb-circle-layer>
    </mb-geojson>
</mb-map>`;
};
const propDef = {
    center: { type: Array, reflect: true },
    zoom: { type: Number, reflect: true },
    view: { type: String, reflect: true },
    applicationState: { type: Object }
};
class GeoMap extends LitElement {
    constructor(registy) {
        super();
        this._registry = registy;
        this._toolBox = factory();
        this._toolBox.addTool(View.SEARCH, searchViewTool(registy));
    }
    static get properties() {
        return propDef;
    }
    attributeChangedCallback(name, old, value) {
        super.attributeChangedCallback(name, old, value);
        if (name === 'view') {
            console.log('change tool');
            this._toolBox.selectTool(value);
        }
    }
    firstUpdated(_changedProperties) {
        this._canvas = factory$1(this.shadowRoot.querySelector('mb-map'));
        this._canvas.onClick(ev => this._toolBox.clickAction(ev));
        this._canvas.onLongClick(ev => this._toolBox.longClickAction(ev));
    }
    render() {
        const selectSuggestion = ev => {
            const { features } = ev;
            const search = this._registry.get('search');
            if (features && features.length) {
                const { properties: { index } } = features[0];
                search.selectSearchResult(this.applicationState.search.searchResult[index]);
            }
        };
        const selectItineraryRoute = ev => {
            const { features } = ev;
            const itinerary = this._registry.get('itinerary');
            if (features && features.length) {
                const { properties: { index } } = features[0];
                itinerary.selectRoute(index);
            }
        };
        const onCameraChange = ev => this._registry.get('map').updateCamera({
            zoom: ev.detail.zoom,
            center: ev.detail.center
        });
        return template({
            zoom: this.zoom,
            center: this.center,
            suggestions: suggestionsToGeoJSON(this.applicationState),
            itinerary: itineraryToGeoJSON(this.applicationState),
            leisure: leisureToGeoJSON(this.applicationState),
            onCameraChange,
            selectSuggestion,
            selectItineraryRoute
        });
    }
}

const loadServices = once((registry, store) => {
    store.injectReducer('map', reducer);
    registry.set('map', provider(store));
});
const loadComponents = once((injector) => {
    const connectedMap = connect(store, (state) => {
        return {
            ...state.map,
            view: state.navigation.selectedView,
            applicationState: state
        };
    });
    customElements.define('mb-map', GeoMap$1);
    customElements.define('mb-geojson', GeoJSONSource);
    customElements.define('mb-circle-layer', CircleLayer);
    customElements.define('mb-line-layer', LineLayer);
    customElements.define('mb-symbol-layer', SymbolLayer);
    customElements.define('citykleta-map', connectedMap(injector(GeoMap)));
});

loadServices(defaultRegistry, store);
loadComponents(defaultInjector);
//# sourceMappingURL=map.js.map
