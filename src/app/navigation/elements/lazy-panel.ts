import {html, LitElement} from 'lit-element';
import {loadingIndicator} from '../../common/elements/icons';
import {View} from '../reducer';
import {defaultInjector, defaultRegistry} from '../../common';
import store from '../../store';
import {style} from './lazy-panel.style';

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

const loadModule = async (view) => {
    const module = await import(resolveModule(view));
    module.loadServices(defaultRegistry, store);
    module.loadComponents(defaultInjector);
    return module.view;
};

export const factory = (view) => {
    const propsDef = {
        selectedView: {type: String, attribute: false}
    };

    return class extends LitElement {

        private _view = null;
        private _content = null;
        private _loaded = false;

        static get styles() {
            return style;
        }

        get loaded() {
            return this._loaded;
        }

        get selectedView() {
            return this._view;
        }

        set selectedView(val) {
            this._view = val;
            if (view === val && this._content === null) {
                loadModule(view)
                    .then(fn => {
                        this._content = fn();
                        this._loaded = true;
                        this.requestUpdate();
                    })
                    .catch(e => {
                        console.error(`could not load module for view ${val}`);
                        throw e;
                    });
            }
        };

        static get properties() {
            return propsDef;
        }

        render() {
            return this._content !== null ? this._content :
                html`<div id="loading-indicator-container">${loadingIndicator()}</div>`;
        }
    };
};