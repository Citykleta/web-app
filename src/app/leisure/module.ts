import {once} from '../utils';
import {LeisurePanel} from './elements/leisure-panel';
import {html} from 'lit-html';
import {ServiceRegistry} from '../common/service-registry';
import {reducer} from './reducer';
import {provider} from './service';
import store from '../store/index';
import {ApplicationState} from '../store/store';
import {LeisureRouteDetails} from './elements/leisure-route-details';
import {connect, define} from '../common';

export * from './actions';
export * from './reducer';
export * from './service';
export {LeisurePanel} from './elements/leisure-panel';

export const loadServices = once((registry: ServiceRegistry, store) => {
    store.injectReducer('leisure', reducer);
    registry.set('leisure', provider(store));
});

export const loadComponents = once(injector => {
    const connectedLeisurePanel = connect(store, (state: ApplicationState) => state.leisure);
    define('citykleta-leisure-panel', connectedLeisurePanel(injector(LeisurePanel)));
    define('citykleta-leisure-route-details', injector(LeisureRouteDetails));
});

export const view = () => html`<citykleta-leisure-panel></citykleta-leisure-panel>`;