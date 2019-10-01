import { a as storage, V as View } from './index-d984c0c5.js';
import { A as ActionType, f as changeHistoryPoint, e as css, L as LitElement, h as html, o as once } from './utils-2a6dac1b.js';
import { c as classMap } from './index-0cf02d49.js';

const selectView = (view) => ({
    type: ActionType.SELECT_VIEW,
    view
});

const navigationActions = {
    selectView
};
const provider = (store, { selectView } = navigationActions) => {
    const stateStorage = storage(window);
    window.onpopstate = (ev) => {
        const { state } = ev;
        store.dispatch(changeHistoryPoint(state));
    };
    store.subscribe(async () => {
        const state = store.getState();
        await stateStorage.set(state);
    });
    return {
        selectView(view) {
            store.dispatch(selectView(view));
        },
        getView() {
            return store.getState().navigation.selectedView;
        }
    };
};

// language=CSS
const style = css `:host {
    --background: var(--background-theme-1);
    font-weight: lighter;
    font-size: 0.95rem;
}

ul {
    display: flex;
    list-style: none;
    padding: 0;
    margin: 0;
}

li {
    background: var(--background);
    border-color: var(--background-theme-3, currentColor);
    border-style: solid;
    border-width: 2px 1px 0 0;
    box-shadow: 0 0 2px 0 var(--background-theme-2) inset;
    padding: 0.6em 2em;
    transition: margin 0.3s;
}

li:last-child {
    border-right-width: 0;
}

li.active {
    --background: var(--background-theme);
    border-top-color: var(--color-theme-1);
    box-shadow: none;
    font-weight: normal;
    margin-top: -0.2rem;
}`;

const navigationItem = (navigation) => ({ label, view }) => html `<li class="${classMap({ active: view === navigation.getView() })}" @click="${() => navigation.selectView(view)}">
                ${label}
            </li>`;
const navigationDefinition = [{
        // @ts-ignore
        label: 'Search',
        view: View.SEARCH
    }, {
        // @ts-ignore
        label: 'Itinerary',
        view: View.ITINERARY
    }, {
        // @ts-ignore
        label: 'Leisure',
        view: View.LEISURE
    }, {
        // @ts-ignore
        label: 'Settings',
        view: View.SETTINGS
    }];
const template = ({ navigation }) => html `<ul>${navigationDefinition.map(navigationItem(navigation))}</ul>`;
const propsDef = {
    selectedView: { type: String, attribute: 'selected-view', reflect: true }
};
class NavigationBar extends LitElement {
    constructor(serviceMap) {
        super();
        this._navigation = serviceMap.get('navigation');
    }
    static get styles() {
        return style;
    }
    static get properties() {
        return propsDef;
    }
    render() {
        return template({ navigation: this._navigation });
    }
}

const loadServices = once((registry, store) => {
    // todo register reducer
    registry.set('navigation', provider(store));
});
const loadComponents = once((injector) => {
    customElements.define('citykleta-navigation-bar', injector(NavigationBar));
});

export { loadComponents as a, loadServices as l };
//# sourceMappingURL=module-ab90622f.js.map
