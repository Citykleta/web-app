import {ItineraryPanel} from './elements/itinerary-panel';
import {StopPoint} from './elements/stop-point';
import {once} from '../utils';
import {html} from 'lit-html';
import store from '../store/index';
import {connect} from '../common/connect';
import {ApplicationState} from '../store/store';

export * from './actions';
export * from './reducer';
export * from './service';
export {ItineraryPanel} from './elements/itinerary-panel';
export {StopPoint} from './elements/stop-point';
export {loadSearchItineraryServices as loadServices} from '../common/index';

export const loadComponents = once((injector) => {
    const connectedItineraryPanel = connect(store, (state: ApplicationState) => state.itinerary);

    customElements.define('citykleta-itinerary-panel', connectedItineraryPanel(injector(ItineraryPanel)));
    customElements.define('citykleta-stop-point', injector(StopPoint));
});

export const view = () => html`<citykleta-itinerary-panel class="panel"></citykleta-itinerary-panel>`;

