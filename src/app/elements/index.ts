import registry, {ServiceRegistry} from '../services/service-registry';
import {ApplicationState} from '../services/store';
import {LocationSuggestionItem} from './common/location-suggestion-item';
import {SearchBox} from './search-box/search-box';
import {SearchPanel} from './search/search-panel';
import {App} from './app';
import {NavigationBar} from './navigation-bar';
import {LocationDetails} from './search/location-details';
import {SettingsPanel} from './settings/settings-panel';
import {ItineraryPanel} from './itinerary/itinerary-panel';
import {StopPoint} from './itinerary/stop-point';
import {ButtonIcon} from './common/button-icon';

const withInjector = (registry: ServiceRegistry) => (klass) => class extends klass {

    constructor() {
        super(registry);
    }

    connectedCallback() {
        super.connectedCallback();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
    }
};

const prodInjector = withInjector(registry);

const copyProps = (src, target) => {
    for (const p of Object.getOwnPropertyNames(src)) {
        target[p] = src[p];
    }
};

const connect = (store, stateToProp = state => state) => (klass) => class extends klass {

    private subscription: Function = null;

    constructor(...args) {
        super(...args);
        copyProps(stateToProp(store.getState()), this);
    }

    connectedCallback() {
        super.connectedCallback();
        this.subscription = store.subscribe(() => {
            const props = stateToProp(store.getState());
            copyProps(props, this);
        });

    }

    disconnectedCallback() {
        this.subscription();
        super.disconnectedCallback();
    }
};

const connectedSearch = connect(registry.store, (state: ApplicationState) => {
    return state.search;
});

const connectedApp = connect(registry.store, (state: ApplicationState) => ({
    theme: state.settings.theme,
    selectedTool: state.tool.selectedTool
}));

const connectedItinerary = connect(registry.store, (state: ApplicationState) => ({
        ...state.itinerary
    })
);

customElements.define('citykleta-button-icon', ButtonIcon);
customElements.define('citykleta-navigation-bar', prodInjector(NavigationBar));
customElements.define('citykleta-location-suggestion', LocationSuggestionItem);
customElements.define('citykleta-search-box', prodInjector(SearchBox));
customElements.define('citykleta-location', LocationDetails);
customElements.define('citykleta-search-panel', connectedSearch(prodInjector(SearchPanel)));
customElements.define('citykleta-settings-panel', prodInjector(SettingsPanel));
customElements.define('citykleta-itinerary-panel', connectedItinerary(prodInjector(ItineraryPanel)));
customElements.define('citykleta-stop-point', prodInjector(StopPoint));
customElements.define('citykleta-app', connectedApp(App));

export const app = document.createElement('citykleta-app');
// app.classList.add('blandine');
document.querySelector('body').appendChild(app);
