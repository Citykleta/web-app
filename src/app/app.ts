import {html, LitElement} from 'lit-element';
import {style} from './app.style';
import {Theme} from './settings/module';
import {View} from './navigation/module';
import {loadingIndicator} from './common/elements/icons';
import {defaultInjector, defaultRegistry} from './common';
import store from './store/index';

export const propsDef = {
    selectedView: {type: String},
    isLoading: {type: Boolean}
};

const resolveModule = (view: View) => {
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

export const template = ({selectedView, isLoading, component}) => html`<citykleta-navigation-bar .selectedView="${selectedView}"></citykleta-navigation-bar>
${isLoading ? html`<div id="loading-indicator"><span>Loading ...</span><span id="spinner-container" aria-hidden="true">${loadingIndicator()}</span></div>` : component()}`;

export class App extends LitElement {

    isLoading = true;

    private _component;

    static get styles() {
        return style;
    }

    static get properties() {
        return propsDef;
    }

    private _selectedView: View;

    get selectedView() {
        return this._selectedView;
    }

    set selectedView(val) {
        if (val !== this._selectedView) {
            this._selectedView = val;
            this._loadModule();
        }
    }

    set theme(this: HTMLElement, val) {
        this.classList.toggle('dark', val === Theme.DARK);
    }

    render() {
        return template({selectedView: this.selectedView, isLoading: this.isLoading, component: this._component});
    }

    private async _loadModule() {
        this.isLoading = true;
        const module = await import(resolveModule(this._selectedView));
        module.loadServices(defaultRegistry, store);
        module.loadComponents(defaultInjector);
        this._component = module.view;
        this.isLoading = false;
    }
}
