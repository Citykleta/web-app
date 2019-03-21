import {ServiceRegistry} from '../services/service-registry';
import registry from '../services/service-registry';
import {ApplicationState} from '../services/store';
import {LocationSuggestionItem} from './location-suggestion-item';
import {SearchBox} from './search-box';
import {SearchPanel} from './search-panel';
import {App} from './app';
import {NavigationBar} from './navigation-bar';
import {LocationDetails} from './location-details';

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

    constructor(...args) {
        super(...args);
        copyProps(stateToProp(store.getState()), this);
    }

    private subscription: Function = null;

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

const connectToSelectedSuggestion = connect(registry.store, (state: ApplicationState) => ({
    selectedSuggestion: state.search.selectedSuggestion
}));

const connectToSelectedTool = connect(registry.store,(state: ApplicationState)=>state.tool);


customElements.define('citykleta-navigation-bar', connectToSelectedTool(prodInjector(NavigationBar)));
customElements.define('citykleta-location-suggestion', LocationSuggestionItem);
customElements.define('citykleta-search-box', prodInjector(SearchBox));
customElements.define('citykleta-location',LocationDetails);
customElements.define('citykleta-search-panel', connectToSelectedSuggestion(prodInjector(SearchPanel)));
customElements.define('citykleta-app', App);

const app = document.createElement('citykleta-app');
document.querySelector('body').appendChild(app);
