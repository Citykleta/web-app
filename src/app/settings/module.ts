import {ServiceRegistry} from '../common/service-registry';
import {provider} from './service';
import {SettingsPanel} from './elements/settings-panel';
import {once} from '../utils';
import {html} from 'lit-html';
import {reducer} from './reducer';
import {define} from '../common';

export * from './service';
export * from './actions';
export * from './reducer';
export {SettingsPanel} from './elements/settings-panel';

export const loadServices = once((registry: ServiceRegistry, store) => {
    store.injectReducer('settings', reducer);
    registry.set('settings', provider(store));
});

export const loadComponents = once((injector) => {
    define('citykleta-settings-panel', injector(SettingsPanel));
});

export const view = () => html`<citykleta-settings-panel></citykleta-settings-panel>`;
