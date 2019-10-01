import { V as View, b as createSearchResultInstance, c as connect, s as store } from './index-edf8c9d7.js';
export { b as createSearchResultInstance, o as defaultState, p as fromLine, n as reducer } from './index-edf8c9d7.js';
import { e as css, L as LitElement, h as html, t as truncate, o as once } from './utils-4526794e.js';
import './module-b1fd9ed1.js';
import { l as loadSearchItineraryComponents } from './index-a4db3c48.js';
export { S as SearchBox, n as fetchClosest, q as fetchClosestFromAPI, p as fetchClosestWithFailure, o as fetchClosestWithSuccess, f as fetchPointsOfInterest, h as fetchPointsOfInterestFromAPI, g as fetchPointsOfInterestWithFailure, e as fetchPointsOfInterestWithSuccess, i as fetchSearchResult, m as fetchSearchResultFromAPI, k as fetchSearchResultWithFailure, j as fetchSearchResultWithSuccess, b as loadServices, r as provider, s as selectSearchResult } from './index-a4db3c48.js';

// language=CSS
const style = css `
    ul {
        list-style: none;
        margin: 0.5em;
        padding: 0;
        display: flex;
        justify-content: center;
    }

    li {
        text-align: center;
        padding: 0.5em;
    }

    citykleta-button-icon {
        --size: 5em;
    }
`;

const template = ({ goTo, goFrom }) => {
    return html `<ul>
<li><citykleta-button-icon @click="${goTo}">Go To</citykleta-button-icon></li>
<li><citykleta-button-icon @click="${goFrom}">Go From</citykleta-button-icon></li>
<li><citykleta-button-icon @click="${() => console.warn('not implemented')}">Save</citykleta-button-icon></li>
</ul>`;
};
class ActionsBar extends LitElement {
    constructor(registry) {
        super();
        this.location = null;
        this._itinerary = registry.get('itinerary');
        this._navigation = registry.get('navigation');
    }
    static get styles() {
        return style;
    }
    render() {
        const goTo = () => {
            this._itinerary.goTo(this.location);
            this._navigation.selectView(View.ITINERARY);
        };
        const goFrom = () => {
            this._itinerary.goFrom(this.location);
            this._navigation.selectView(View.ITINERARY);
        };
        return template({
            goTo,
            goFrom
        });
    }
}

// language=CSS
const style$1 = css `
    citykleta-search-box,
    citykleta-location {
        background: var(--background-theme);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12),
        0 4px 4px rgba(0, 0, 0, 0.12),
        0 6px 4px rgba(0, 0, 0, 0.12);
    }
    
    citykleta-search-box{
        max-height: 16em;
    }

    citykleta-location {
        padding: 0 1em;
    }
    
    :host > *:not(:first-child){
        margin-top: 1em;
    }
`;

const template$1 = ({ selectedSearchResult, isSearching, searchResult, onValue }) => {
    return html `
    <citykleta-search-box id="search-box" .isBusy="${isSearching}" .suggestions="${searchResult}" .selectedSuggestion="${selectedSearchResult}" @value-change="${onValue}"></citykleta-search-box>
    ${selectedSearchResult !== null ? createSearchResultInstance(selectedSearchResult).toDetailElement() : ''}
`;
};
const propDef = {
    searchResult: { type: Array },
    selectedSearchResult: { type: Object },
    isSearching: { type: Boolean }
};
class SearchPanel extends LitElement {
    constructor(serviceRegistry) {
        super();
        this.isSearching = false;
        this.selectedSearchResult = null;
        this.searchResult = [];
        this._search = null;
        this._search = serviceRegistry.get('search');
    }
    static get styles() {
        return style$1;
    }
    static get properties() {
        return propDef;
    }
    render() {
        return template$1({
            isSearching: this.isSearching,
            searchResult: this.searchResult,
            selectedSearchResult: this.selectedSearchResult,
            onValue: (ev) => {
                this._search.selectSearchResult(ev.detail.value);
            }
        });
    }
}

// language=CSS
const style$2 = css `
    h2 {
        border-bottom: 2px solid var(--color-theme);
    }

    .location {
        margin: 0;
    }

    .description {
        font-size: 0.95em;
        font-style: italic;
    }

    .location span:last-child {
        font-weight: 300;
        font-style: italic;
        text-align: right;
    }
`;

const template$2 = ({ location: val }) => {
    const searchResultInstance = createSearchResultInstance(val);
    const center = searchResultInstance.toPoint();
    return html `
<article>
    <h2><slot name="title"><span>${val.name}</span></slot></h2>
    <span>debug_category:${val.category}</span>
    ${val.description ? html `<p class="description">${val.description}</p>` : ''}
    <address>
        <slot name="address">${html `<div>${searchResultInstance.toOptionElement()}</div>`}</slot>
        <div class="location">
            <span>Location</span>:
            <span>${truncate(center.lng)} / ${truncate(center.lat)}</span>
        </div>
    </address>
<citykleta-actions-bar .location="${val}"></citykleta-actions-bar>
</article>`;
};
const propDef$1 = {
    location: {
        type: Object
    }
};
class LocationDetails extends LitElement {
    constructor() {
        super(...arguments);
        this.location = null;
    }
    static get styles() {
        return style$2;
    }
    static get properties() {
        return propDef$1;
    }
    render() {
        return template$2({ location: this.location });
    }
}

const loadComponents = once((injector) => {
    const connectedSearchPanel = connect(store, (state) => state.search);
    loadSearchItineraryComponents(injector);
    customElements.define('citykleta-location', injector(LocationDetails));
    customElements.define('citykleta-actions-bar', injector(ActionsBar));
    customElements.define('citykleta-search-panel', connectedSearchPanel(injector(SearchPanel)));
});
const view = () => html `<citykleta-search-panel class="panel"></citykleta-search-panel>`;

export { ActionsBar, SearchPanel, loadComponents, view };
//# sourceMappingURL=search.js.map
