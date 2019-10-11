import {html, LitElement} from 'lit-element';
import {formatDistance, formatDuration, Route} from '../../utils';
import {ItineraryService} from '../service';
import {ServiceRegistry} from '../../common/service-registry';
import {style} from './route-details.style';
import {style as listBoxStyle} from '../../common/elements/listbox.style';

export const template = ({routes, selectedRoute, itinerary}) => html`<citykleta-listbox @change="${ev => itinerary.selectRoute(ev.selectedIndex)}" aria-labelledby="route-suggestions" .selectedIndex="${selectedRoute}">${routes.map((r, i) => html`<citykleta-listbox-option  ?selected=${i === 0}>
<dl>
    <dt>Distance</dt><dd>${formatDistance(r.distance)}</dd>
    <dt>Duration</dt><dd>${formatDuration(r.duration)}</dd>
</dl>
</citykleta-listbox-option>`)}</citykleta-listbox>`;

export const propDef = {
    routes: {type: Array},
    selectedRoute: {type: Number}
};

export class RouteDetails extends LitElement {

    private routes: Route[];
    private selectedRoute: number;
    private readonly _itinerary: ItineraryService;

    constructor(registry: ServiceRegistry) {
        super();
        this._itinerary = registry.get('itinerary');
    }

    static get properties() {
        return propDef;
    }

    static get styles() {
        return [style, listBoxStyle];
    }

    render() {
        return template({
            routes: this.routes,
            selectedRoute: this.selectedRoute,
            itinerary: this._itinerary
        });
    }
}
