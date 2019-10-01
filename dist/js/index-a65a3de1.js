import { b as createSearchResultInstance, I as InsertionPosition, m as moveItineraryPointWithSideEffects, d as addItineraryPointWithSideEffects, r as removeItineraryPointWithSideEffects, e as changeItineraryPointWithSideEffects, g as goTo, f as goFrom, h as resetRoutes, i as selectRoute, l as loadingIndicator, j as myLocation, k as reducer, n as reducer$1 } from './index-5be5570a.js';
import { g as directive, i as AttributePart, P as PropertyPart, A as ActionType, e as css, L as LitElement, h as html, j as debounce, o as once } from './utils-2edcd016.js';

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * Stores the ClassInfo object applied to a given AttributePart.
 * Used to unset existing values when a new ClassInfo object is applied.
 */
const classMapCache = new WeakMap();
/**
 * A directive that applies CSS classes. This must be used in the `class`
 * attribute and must be the only part used in the attribute. It takes each
 * property in the `classInfo` argument and adds the property name to the
 * element's `classList` if the property value is truthy; if the property value
 * is falsey, the property name is removed from the element's `classList`. For
 * example
 * `{foo: bar}` applies the class `foo` if the value of `bar` is truthy.
 * @param classInfo {ClassInfo}
 */
const classMap = directive((classInfo) => (part) => {
    if (!(part instanceof AttributePart) || (part instanceof PropertyPart) ||
        part.committer.name !== 'class' || part.committer.parts.length > 1) {
        throw new Error('The `classMap` directive must be used in the `class` attribute ' +
            'and must be the only part in the attribute.');
    }
    const { committer } = part;
    const { element } = committer;
    // handle static classes
    if (!classMapCache.has(part)) {
        element.className = committer.strings.join(' ');
    }
    const { classList } = element;
    // remove old classes that no longer apply
    const oldInfo = classMapCache.get(part);
    for (const name in oldInfo) {
        if (!(name in classInfo)) {
            classList.remove(name);
        }
    }
    // add new classes
    for (const name in classInfo) {
        const value = classInfo[name];
        if (!oldInfo || value !== oldInfo[name]) {
            // We explicitly want a loose truthy check here because
            // it seems more convenient that '' and 0 are skipped.
            const method = value ? 'add' : 'remove';
            classList[method](name);
        }
    }
    classMapCache.set(part, classInfo);
});
//# sourceMappingURL=class-map.js.map

const registry = () => {
    const serviceMap = new Map();
    return {
        get(label) {
            if (!serviceMap.has(label)) {
                throw new Error(`could not find service ${label}`);
            }
            return serviceMap.get(label);
        },
        set(label, service) {
            if (serviceMap.has(label)) {
                throw new Error(`service ${label} has already been registered`);
            }
            serviceMap.set(label, service);
            return this.get(label);
        }
    };
};

const withInjector = (registry) => (klass) => class extends klass {
    constructor() {
        super(registry);
    }
};

const fetchPointsOfInterest = (query) => ({
    type: ActionType.FETCH_POINTS_OF_INTEREST,
    query
});
const fetchPointsOfInterestWithSuccess = (pointsOfInterest) => ({
    type: ActionType.FETCH_POINTS_OF_INTEREST_SUCCESS,
    pointsOfInterest
});
const fetchPointsOfInterestWithFailure = (error) => ({
    type: ActionType.FETCH_POINTS_OF_INTEREST_FAILURE,
    error
});
const fetchPointsOfInterestFromAPI = (query) => async (dispatch, getState, API) => {
    const { geocoder } = API;
    dispatch(fetchPointsOfInterest(query));
    try {
        const res = await geocoder.searchPointsOfInterest(query);
        return dispatch(fetchPointsOfInterestWithSuccess(res));
    }
    catch (e) {
        return dispatch(fetchPointsOfInterestWithFailure(e));
    }
};
const fetchSearchResult = (query) => ({
    type: ActionType.FETCH_SEARCH_RESULT,
    query
});
const fetchSearchResultWithSuccess = (result) => ({
    type: ActionType.FETCH_SEARCH_RESULT_SUCCESS,
    result
});
const fetchSearchResultWithFailure = (error) => ({
    type: ActionType.FETCH_SEARCH_RESULT_FAILURE,
    error
});
const fetchSearchResultFromAPI = (query) => async (dispatch, getState, API) => {
    const { geocoder } = API;
    dispatch(fetchSearchResult(query));
    try {
        const res = await geocoder.searchAddress(query);
        return dispatch(fetchSearchResultWithSuccess(res));
    }
    catch (e) {
        return dispatch(fetchSearchResultWithFailure(e));
    }
};
const selectSearchResult = (result) => ({
    type: ActionType.SELECT_SEARCH_RESULT,
    searchResult: result
});
const fetchClosest = (location) => ({
    type: ActionType.FETCH_CLOSEST,
    location
});
const fetchClosestWithSuccess = (result) => ({
    type: ActionType.FETCH_CLOSEST_SUCCESS,
    result
});
const fetchClosestWithFailure = (error) => ({
    type: ActionType.FETCH_CLOSEST_FAILURE,
    error
});
const fetchClosestFromAPI = (location) => async (dispatch, getState, API) => {
    const { geocoder } = API;
    dispatch(fetchClosest(location));
    try {
        const res = await geocoder.reverse(location);
        return dispatch(fetchClosestWithSuccess(res));
    }
    catch (e) {
        return dispatch(fetchClosestWithFailure(e));
    }
};

const updateMapPosition = (position) => {
    const newPosition = {
        type: ActionType.UPDATE_MAP
    };
    if (position.center !== void 0) {
        newPosition.center = position.center;
    }
    if (position.zoom !== void 0) {
        newPosition.zoom = position.zoom;
    }
    return newPosition;
};

const searchActions = {
    fetchPointsOfInterestFromAPI,
    fetchPointsOfInterestWithSuccess,
    fetchSearchResultFromAPI,
    fetchSearchResultWithSuccess,
    selectSearchResult,
    fetchClosestFromAPI,
    updateMapPosition
};
const provider = (store, { fetchPointsOfInterestFromAPI, fetchPointsOfInterestWithSuccess, fetchSearchResultFromAPI, fetchSearchResultWithSuccess, selectSearchResult, fetchClosestFromAPI, updateMapPosition } = searchActions) => ({
    async searchPointOfInterest(query) {
        return query ? store.dispatch(fetchPointsOfInterestFromAPI(query))
            : store.dispatch(fetchPointsOfInterestWithSuccess([]));
    },
    async searchPointOfInterestNearBy(location) {
        return store.dispatch(fetchClosestFromAPI(location));
    },
    async searchAddress(query) {
        return query ? store.dispatch(fetchSearchResultFromAPI(query))
            : store.dispatch(fetchSearchResultWithSuccess([]));
    },
    selectSearchResult(r) {
        const { lng, lat } = createSearchResultInstance(r).toPoint();
        store.dispatch(selectSearchResult(r));
        store.dispatch(updateMapPosition({
            center: [lng, lat]
        }));
    },
    getSearchResult() {
        return store.getState().search.searchResult;
    }
});

const itineraryActions = {
    moveItineraryPointWithSideEffects,
    addItineraryPointWithSideEffects,
    removeItineraryPointWithSideEffects,
    changeItineraryPointWithSideEffects,
    goTo,
    goFrom,
    resetRoutes,
    selectRoute
};
const provider$1 = (store, { moveItineraryPointWithSideEffects, addItineraryPointWithSideEffects, removeItineraryPointWithSideEffects, changeItineraryPointWithSideEffects, goTo, goFrom, resetRoutes, selectRoute } = itineraryActions) => {
    let movingPoint = null;
    return {
        startMove(id) {
            const { stops } = store.getState().itinerary;
            movingPoint = stops
                .find(i => i.id === id) || null;
        },
        async moveBefore(id) {
            if (movingPoint) {
                // @ts-ignore
                store.dispatch(moveItineraryPointWithSideEffects(movingPoint.id, id, InsertionPosition.BEFORE));
            }
            movingPoint = null;
        },
        async moveAfter(id) {
            if (movingPoint) {
                // @ts-ignore
                store.dispatch(moveItineraryPointWithSideEffects(movingPoint.id, id, InsertionPosition.AFTER));
            }
            movingPoint = null;
        },
        async addPoint(point, beforeId) {
            return store.dispatch(addItineraryPointWithSideEffects(point, beforeId !== undefined ? beforeId : null));
        },
        async removePoint(id) {
            return store.dispatch(removeItineraryPointWithSideEffects(id));
        },
        async updatePoint(id, location) {
            return store.dispatch(changeItineraryPointWithSideEffects(id, location));
        },
        reset() {
            store.dispatch(resetRoutes());
        },
        goTo(location) {
            store.dispatch(goTo(location));
        },
        goFrom(location) {
            store.dispatch(goFrom(location));
        },
        selectRoute(r) {
            store.dispatch(selectRoute(r));
        }
    };
};

// language=CSS
const style = css `:host {
    --border-color:var(--color-theme);
    --color:inherit;
    --suggestion-bg-color:inherit;
    --suggestion-color:inherit;
    --suggestion-border-color:var(--background-theme-1);
    display: flex;
    flex-direction: column;
}

[aria-expanded=false] + [role=listbox]{
    display: none;
}

[role=combobox] {
    border-bottom: 2px solid var(--border-color);
    display: flex;
    padding: 0.4em;
}

#loading-indicator {
    align-items: center;
    display: flex;
    padding: 2px;
    width: 2em;
}

#loading-indicator > svg {
    animation: 1s linear rotateSpinner;
    animation-iteration-count: infinite;
    stroke: currentColor;
    fill: currentColor;
}

#loading-indicator.hidden > svg {
    visibility: hidden;
}

input {
    background: inherit;
    border: none;
    box-shadow: none;
    color: var(--color);
    flex-grow: 1;
    font-size: 0.9em;
    outline: none;
    padding: 0 0.2em;
}

ul:empty, ol:empty {
    border-color: transparent;
}

[role=listbox] {
    list-style: none;
    margin: 0;
    overflow: scroll;
    padding: 0;
    width: 100%;
}

li {
    font-size: 0.95em;
    padding: 0.5em 1em;
    background: var(--suggestion-bg-color);
    color: var(--suggestion-color);
    transition: background-color 0.3s, color 0.3s;
}

li[aria-selected=true] {
    --suggestion-bg-color: var(--color-theme-1);
    --suggestion-color: var(--font-color-theme-2);
}

li:not(:last-child) {
    border-bottom: 1px solid var(--suggestion-border-color);
}

#my-location{
    --color: var(--color-theme-compl);
    align-self: center;
    margin: 0 0.4em;
}

@keyframes rotateSpinner {
    from {
        transform: rotateZ(0);
    }

    from {
        transform: rotateZ(360deg);
    }
}`;

const propDef = {
    isBusy: {
        type: Boolean,
        attribute: false
    },
    suggestions: {
        type: Array,
        attribute: false
    },
    selectedSuggestion: {
        type: Object,
        attribute: false
    },
    value: {
        type: Object,
        attribute: false
    }
};
// todo remove dependency on store
class SearchBox extends LitElement {
    constructor(serviceRegistry) {
        super();
        this.value = null;
        this.selectedSuggestion = null;
        this.isBusy = false;
        this._suggestions = [];
        this._searchInput = null;
        this._search = serviceRegistry.get('search');
        this.addEventListener('keydown', this.handleKeyDown);
    }
    static get styles() {
        return style;
    }
    static get properties() {
        return propDef;
    }
    get suggestions() {
        return this._suggestions;
    }
    set suggestions(value) {
        const oldValue = this.suggestions;
        this._suggestions = value;
        // re init if search has switched the context
        if (!value.includes(this.selectedSuggestion)) {
            this.selectedSuggestion = null;
        }
        this.requestUpdate('suggestions', oldValue);
    }
    get searchInput() {
        if (this._searchInput) {
            return this._searchInput;
        }
        return this._searchInput = this.shadowRoot.querySelector('input');
    }
    render() {
        const { suggestions } = this;
        const valueString = this.value === null ? '' : createSearchResultInstance(this.value).toString();
        const onInput = debounce(() => {
            this.suggest(this.searchInput.value);
        });
        const suggestionElements = suggestions.map((val, index) => {
            const onClick = () => {
                this.selectedSuggestion = val;
                this.commitValue(val);
            };
            return html `<li @click="${onClick}" role="option" aria-selected="${this.selectedSuggestion === val}" id="${index}">
                <citykleta-location-suggestion .suggestion="${val}"></citykleta-location-suggestion>
            </li>`;
        });
        const onSubmit = (ev => {
            ev.preventDefault();
            this.submit(this.searchInput.value);
        });
        return html `
<form @submit="${onSubmit}" aria-owns="place-suggestions-box" role="combobox" aria-expanded="${suggestions.length > 0}" aria-haspopup="listbox">
    <div id="loading-indicator" class="${classMap({ hidden: !this.isBusy })}" aria-hidden="true">
        ${loadingIndicator()}
    </div>
    <input @input="${onInput}" .value="${valueString}" aria-controls="place-suggestions-box" type="search" placeholder="ex: teatro Karl Marx">
    <citykleta-button-icon label="select my location" id="my-location">${myLocation()}</citykleta-button-icon>
</form>
<ol role="listbox" id="place-suggestions-box">
${suggestionElements}
</ol>
`;
    }
    updated(changedProperties) {
        if (changedProperties.has('selectedSuggestion')) {
            this.searchInput.focus();
        }
    }
    // todo refactor suggest & submit
    async suggest(query) {
        try {
            this.isBusy = true;
            await this._search.searchPointOfInterest(query);
            this.suggestions = this._search.getSearchResult();
        }
        catch (e) {
            this.suggestions = [];
        }
        finally {
            this.isBusy = false;
        }
    }
    async submit(value) {
        try {
            this.isBusy = true;
            await this._search.searchAddress(value);
            this.suggestions = this._search.getSearchResult();
        }
        catch (e) {
            this.suggestions = [];
        }
        finally {
            this.isBusy = false;
        }
    }
    changeSelectedSuggestion(value) {
        this.selectedSuggestion = value;
        this._search.selectSearchResult(value);
    }
    commitValue(newVal) {
        this.value = newVal;
        this.suggest('');
        this.dispatchEvent(new CustomEvent('value-change', {
            detail: {
                value: newVal
            }
        }));
    }
    handleKeyDown(ev) {
        const { key } = ev;
        switch (key) {
            case 'ArrowDown':
            case 'ArrowUp': {
                if (this.suggestions.length) {
                    ev.preventDefault();
                    const index = this.suggestions.indexOf(this.selectedSuggestion);
                    let actualIndex = index;
                    if (key === 'ArrowDown') {
                        actualIndex = index + 1 >= this.suggestions.length ? 0 : index + 1;
                    }
                    else {
                        actualIndex = index - 1 >= 0 ? index - 1 : this.suggestions.length - 1;
                    }
                    this.changeSelectedSuggestion(this.suggestions[actualIndex]);
                }
                break;
            }
            case 'Escape': {
                this.suggest('');
                break;
            }
            case 'Enter': {
                if (this.selectedSuggestion) {
                    ev.preventDefault();
                    this.commitValue(this.selectedSuggestion);
                }
            }
        }
    }
}

// language=CSS
const style$1 = css `
    .municipality {
        font-size: 0.9em;
        margin: 0 0.5em;
        font-weight: 300;
    }
`;

const template = ({ suggestion }) => createSearchResultInstance(suggestion).toOptionElement();
const propDef$1 = {
    suggestion: {
        type: Object
    }
};
class LocationSuggestionItem extends LitElement {
    constructor() {
        super(...arguments);
        this.suggestion = null;
    }
    static get styles() {
        return style$1;
    }
    static get properties() {
        return propDef$1;
    }
    render() {
        return template({ suggestion: this.suggestion });
    }
}

const defaultRegistry = registry();
const defaultInjector = withInjector(defaultRegistry);
const loadSearchItineraryServices = once((registry, store) => {
    store.injectReducer('itinerary', reducer);
    store.injectReducer('search', reducer$1);
    registry.set('search', provider(store));
    registry.set('itinerary', provider$1(store));
});
const loadSearchItineraryComponents = once(injector => {
    if (!customElements.get('citykleta-search-box')) {
        customElements.define('citykleta-search-box', injector(SearchBox));
    }
    if (!customElements.get('citykleta-location-suggestion')) {
        customElements.define('citykleta-location-suggestion', LocationSuggestionItem);
    }
});

export { SearchBox as S, defaultInjector as a, loadSearchItineraryServices as b, classMap as c, defaultRegistry as d, fetchPointsOfInterestWithSuccess as e, fetchPointsOfInterest as f, fetchPointsOfInterestWithFailure as g, fetchPointsOfInterestFromAPI as h, fetchSearchResult as i, fetchSearchResultWithSuccess as j, fetchSearchResultWithFailure as k, loadSearchItineraryComponents as l, fetchSearchResultFromAPI as m, fetchClosest as n, fetchClosestWithSuccess as o, fetchClosestWithFailure as p, fetchClosestFromAPI as q, provider as r, selectSearchResult as s, provider$1 as t, updateMapPosition as u };
//# sourceMappingURL=index-a65a3de1.js.map
