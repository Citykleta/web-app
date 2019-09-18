import {once} from '../utils';
import {LeisurePanel} from './elements/leisure-panel';
import {html} from 'lit-html';
import {ServiceRegistry} from '../common/service-registry';
import {reducer} from './reducer';
import {provider} from './service';
import {connect} from '../common/connect';
import store from '../store/index';
import {ApplicationState} from '../store/store';

export const loadServices = once((registry: ServiceRegistry, store) => {
    store.injectReducer('leisure', reducer);
    registry.set('leisure', provider(store));
});

export const loadComponents = once(injector => {
    const connectedLeisurePanel = connect(store, (state: ApplicationState) => state.leisure);
    customElements.define('citykleta-leisure-panel', connectedLeisurePanel(injector(LeisurePanel)));
});

export const view = () => html`<citykleta-leisure-panel class="panel"></citykleta-leisure-panel>`;