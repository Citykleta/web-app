import {ActionsBar} from './elements/actions-bar';
import {SearchBox} from './elements/search-box';
import {SearchPanel} from './elements/search-panel';
import {once} from '../utils';
import {html} from 'lit-html';
import {LocationDetails} from './elements/location-details';
import store from '../store/index';
import {ApplicationState} from '../store/store';
import {connect, define} from '../common';

export * from './actions';
export * from './reducers';
export * from './service';
export {ActionsBar} from './elements/actions-bar';
export {SearchBox} from './elements/search-box';
export {SearchPanel} from './elements/search-panel';
export * from './elements/search-result';
export {loadSearchItineraryServices as loadServices} from '../common/index';

export const loadComponents = once((injector) => {
    const connectedSearchPanel = connect(store, (state: ApplicationState) => state.search);
    define('citykleta-search-box', injector(SearchBox));
    define('citykleta-location', injector(LocationDetails));
    define('citykleta-actions-bar', injector(ActionsBar));
    define('citykleta-search-panel', connectedSearchPanel(injector(SearchPanel)));
});

export const view = () => html`<citykleta-search-panel></citykleta-search-panel>`;
