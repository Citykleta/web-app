import { l as loadingIndicator, s as store, V as View, c as connect } from './index-edf8c9d7.js';
import { e as css, L as LitElement, T as Theme, h as html } from './utils-4526794e.js';
import './settings.js';
import { l as loadServices, a as loadComponents } from './module-b1fd9ed1.js';
import { d as defaultRegistry, a as defaultInjector } from './index-a4db3c48.js';

// language=CSS
const style = css `
    :host {
        color: var(--font-color-theme);
        padding: 0.6em;
        max-height: 100vh;
    }

    .panel {
        display: flex;
        flex-direction: column;
    }
    
    #loading-indicator, #spinner-container{
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    #loading-indicator{
        background: var(--background-theme);
        padding: 1em;
    }
    
    #loading-indicator span:last-child{
        height: 3em;
        width: 3em;
    }

    #loading-indicator  svg {
        animation: 1s linear rotateSpinner;
        animation-iteration-count: infinite;
        stroke: currentColor;
        fill: currentColor;
    }

    @keyframes rotateSpinner {
        from {
            transform: rotateZ(0);
        }

        from {
            transform: rotateZ(360deg);
        }
    }
`;

const propsDef = {
    selectedView: { type: String },
    isLoading: { type: Boolean }
};
const resolveModule = (view) => {
    switch (view) {
        case View.SEARCH:
            return './search.js';
        case View.ITINERARY:
            return './itinerary.js';
        case View.SETTINGS:
            return './settings.js';
        case View.LEISURE:
            return './leisure.js';
        default:
            throw new Error(`could not find module for view: ${view}`);
    }
};
const template = ({ selectedView, isLoading, component }) => html `<citykleta-navigation-bar .selectedView="${selectedView}"></citykleta-navigation-bar>
${isLoading ? html `<div id="loading-indicator"><span>Loading ...</span><span id="spinner-container" aria-hidden="true">${loadingIndicator()}</span></div>` : component()}`;
class App extends LitElement {
    constructor() {
        super(...arguments);
        this.isLoading = true;
    }
    static get styles() {
        return style;
    }
    static get properties() {
        return propsDef;
    }
    get selectedView() {
        return this._selectedView;
    }
    set selectedView(val) {
        if (val !== this._selectedView) {
            this._selectedView = val;
            this._loadModule();
        }
    }
    set theme(val) {
        this.classList.toggle('dark', val === Theme.DARK);
    }
    render() {
        return template({ selectedView: this.selectedView, isLoading: this.isLoading, component: this._component });
    }
    async _loadModule() {
        this.isLoading = true;
        const module = await import(resolveModule(this._selectedView));
        module.loadServices(defaultRegistry, store);
        module.loadComponents(defaultInjector);
        this._component = module.view;
        this.isLoading = false;
    }
}

loadServices(defaultRegistry, store);
loadComponents(defaultInjector);

// language=CSS
const style$1 = css `
    :host {
        --color: var(--color-theme-compl);
        --size: 1.8rem;
    }

    button {
        align-items: center;
        background: var(--background);
        border: 2px solid var(--color);
        border-radius: 50%;
        box-sizing: border-box;
        // box-shadow: 0 0 3px rgba(0, 0, 0, 0.3),
        // 0 0 4px rgba(0, 0, 0, 0.3),
        // 0 0 5px rgba(0, 0, 0, 0.2);
        color: var(--color);
        cursor: pointer;
        display: flex;
        height: var(--size);
        justify-content: center;
        outline: none;
        padding: 2px;
        transition: background 0.3s, color 0.3s;
        width: var(--size);
    }

    button:focus, button:hover {
        --background: var(--color-theme-compl);
        --color: var(--color-theme-compl-1);
        box-shadow: 0 0 4px 1px var(--background);
        color: var(--font-color-theme-2);
    }

    :host(.danger) {
        --color: var(--color-theme);
        --size: 1.5rem;
    }

    :host(.danger) button:focus, :host(.danger) button:hover {
        --background: var(--color-theme);
        --color: var(--color-theme-1);
        color: var(--font-color-theme-2);
    }

    ::slotted(svg) {
        background: transparent;
        fill: currentColor;
        stroke: currentColor;
        height: 100%;
        width: 100%;
    }
`;

const propDef = {
    label: {
        type: String,
        reflect: true
    }
};
const template$1 = ({ label }) => html `<button><span id="button-label" hidden>${label}</span><slot></slot></button>`;
class ButtonIcon extends LitElement {
    constructor() {
        super();
        this.label = 'fix me I have no accessible label!';
    }
    static get styles() {
        return style$1;
    }
    static get properties() {
        return propDef;
    }
    render() {
        return template$1({
            label: this.label
        });
    }
}

const ConnectedApp = connect(store, (state) => {
    return {
        selectedView: state.navigation.selectedView,
        theme: state.settings.theme // module my not be loaded
    };
})(App);
customElements.define('citykleta-button-icon', ButtonIcon);
customElements.define('citykleta-app', ConnectedApp);
//# sourceMappingURL=app.js.map
