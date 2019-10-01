import { l as loadingIndicator, F as reducer, c as connect, s as store } from './index-edf8c9d7.js';
export { G as defaultState, F as reducer } from './index-edf8c9d7.js';
import { e as css, L as LitElement, h as html, A as ActionType, o as once } from './utils-4526794e.js';

// language=CSS
const style = css `
    :host {
        background: var(--background-theme);
        --route-bg-color: inherit;
        --route-color: inherit;
        --route-border-color: var(--background-theme-1);
    }

    :host > * {
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12),
        0 4px 4px rgba(0, 0, 0, 0.12),
        0 6px 4px rgba(0, 0, 0, 0.12);
    }

    ul {
        list-style: none;
        margin: 0;
        padding: 0;
        width: 100%;
    }

    li {
        padding: 0.5em 1em;
        background: var(--route-bg-color);
        color: var(--route-color);
        transition: background-color 0.3s, color 0.3s;
    }

    li[aria-selected=true] {
        --route-bg-color: var(--color-theme-1);
        --route-color: var(--font-color-theme-2);
    }

    li:not(:last-child) {
        border-bottom: 1px solid var(--route-border-color);
    }

    h2 {
        margin: 0;
    }

    p {
        margin: 0.25em 0;
    }
`;

const template = ({ leisure, isSearching, routes, selectedRouteId }) => {
    if (isSearching) {
        return html `<div>${loadingIndicator()}</div>`;
    }
    else {
        return html `<ul tabindex="0">
${routes.map(r => html `<li @click=${() => leisure.selectRoute(r.id)} aria-selected="${r.id === selectedRouteId}"><article>
<h2>${r.title}</h2>
<p>${r.description}</p>
</article></li>`)}
</ul>`;
    }
};
const propDef = {
    isSearching: { type: Boolean },
    routes: { type: Array },
    selectedRouteId: { type: Number }
};
// todo refactor with equivalent Listbox
class LeisurePanel extends LitElement {
    constructor(serviceRegistry) {
        super();
        this.isSearching = false;
        this.selectedRouteId = null;
        this.routes = [];
        this._leisure = null;
        this._leisure = serviceRegistry.get('leisure');
    }
    static get styles() {
        return style;
    }
    static get properties() {
        return propDef;
    }
    connectedCallback() {
        super.connectedCallback();
        this._leisure.searchRoutes();
        this.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    render() {
        return template({
            leisure: this._leisure,
            isSearching: this.isSearching,
            selectedRouteId: this.selectedRouteId,
            routes: this.routes
        });
    }
    handleKeyDown(ev) {
        const { key } = ev;
        const routeLength = this.routes.length;
        const currentIndex = this.routes.findIndex(r => r.id === this.selectedRouteId);
        if (routeLength) {
            let newRouteIndex = currentIndex > -1 ? currentIndex : 0;
            switch (key) {
                case 'ArrowDown': {
                    newRouteIndex = (newRouteIndex + 1) % routeLength;
                    break;
                }
                case 'ArrowUp': {
                    newRouteIndex = (newRouteIndex - 1) >= 0 ? newRouteIndex - 1 : routeLength - 1;
                    break;
                }
            }
            this._leisure.selectRoute(this.routes[newRouteIndex].id);
        }
    }
}

const fetchLeisureRoutes = () => ({
    type: ActionType.FETCH_LEISURE_ROUTES
});
const fetchLeisureRoutesWithFailure = (error) => ({
    type: ActionType.FETCH_LEISURE_ROUTES_FAILURE,
    error
});
const fetchLeisureRoutesWithSuccess = (result) => ({
    type: ActionType.FETCH_LEISURE_ROUTES_SUCCESS,
    result
});
const fetchLeisureRoutesFromAPI = () => async (dispatch, getState, API) => {
    const { leisure } = API;
    dispatch(fetchLeisureRoutes());
    try {
        const result = await leisure.searchRoutes();
        dispatch(fetchLeisureRoutesWithSuccess(result));
    }
    catch (e) {
        return dispatch(fetchLeisureRoutesWithFailure(e));
    }
};
const selectLeisureRoute = (routeId) => ({
    type: ActionType.SELECT_LEISURE_ROUTE,
    routeId
});

const leisureActions = {
    fetchLeisureRoutesFromAPI,
    selectLeisureRoute
};
const provider = (store, { fetchLeisureRoutesFromAPI, selectLeisureRoute } = leisureActions) => {
    return {
        async searchRoutes() {
            store.dispatch(fetchLeisureRoutesFromAPI());
        },
        selectRoute(id) {
            store.dispatch(selectLeisureRoute(id));
        }
    };
};

const loadServices = once((registry, store) => {
    store.injectReducer('leisure', reducer);
    registry.set('leisure', provider(store));
});
const loadComponents = once(injector => {
    const connectedLeisurePanel = connect(store, (state) => state.leisure);
    customElements.define('citykleta-leisure-panel', connectedLeisurePanel(injector(LeisurePanel)));
});
const view = () => html `<citykleta-leisure-panel class="panel"></citykleta-leisure-panel>`;

export { LeisurePanel, fetchLeisureRoutes, fetchLeisureRoutesFromAPI, fetchLeisureRoutesWithFailure, fetchLeisureRoutesWithSuccess, loadComponents, loadServices, provider, selectLeisureRoute, view };
//# sourceMappingURL=leisure.js.map
