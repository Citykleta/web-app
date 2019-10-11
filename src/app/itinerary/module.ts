import {ItineraryPanel} from './elements/itinerary-panel';
import {StopPoint} from './elements/stop-point';
import {once} from '../utils';
import {html} from 'lit-html';
import store from '../store/index';
import {ApplicationState} from '../store/store';
import {RouteDetails} from './elements/route-details';
import {SearchBox} from '../search/elements/search-box';
import {connect, define} from '../common';

export * from './actions';
export * from './reducer';
export * from './service';
export {ItineraryPanel} from './elements/itinerary-panel';
export {StopPoint} from './elements/stop-point';
export {loadSearchItineraryServices as loadServices} from '../common/index';

export const loadComponents = once((injector) => {
    const connectedItineraryPanel = connect(store, (state: ApplicationState) => state.itinerary);
    define('citykleta-search-box', injector(SearchBox));
    define('citykleta-itinerary-panel', connectedItineraryPanel(injector(ItineraryPanel)));
    define('citykleta-stop-point', injector(StopPoint));
    define('citykleta-route-details', injector(RouteDetails));
});

export const view = () => html`<citykleta-itinerary-panel></citykleta-itinerary-panel>`;

