import {html, LitElement} from 'lit-element';
import {formatDistance, formatDuration, Route} from '../../utils';
import {ItineraryService} from '../service';
import {ServiceRegistry} from '../../common/service-registry';
import {style} from './route-details.style';

export const template = ({routes, selectedRoute, itinerary}) => html`<ol>${routes.map((r, i) => html`<li @click="${() => itinerary.selectRoute(i)}" aria-selected="${i === selectedRoute}">
<dl>
    <dt>Distance</dt><dd>${formatDistance(r.distance)}</dd>
    <dt>Duration</dt><dd>${formatDuration(r.duration)}</dd>
</dl>
</li>`)}</ol>`;

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
        this.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    static get properties() {
        return propDef;
    }

    static get styles() {
        return style;
    }

    render() {
        return template({
            routes: this.routes,
            selectedRoute: this.selectedRoute,
            itinerary: this._itinerary
        });
    }

    private handleKeyDown(ev) {
        const {key} = ev;
        const routeLength = this.routes.length;
        if (routeLength) {
            const selectedRoute = this.selectedRoute;
            let newRoute = selectedRoute;
            switch (key) {
                case 'ArrowDown': {
                    newRoute = (selectedRoute + 1) % routeLength;
                    break;
                }
                case 'ArrowUp': {
                    newRoute = selectedRoute - 1 >= 0 ? selectedRoute - 1 : routeLength - 1;
                    break;
                }
            }
            this._itinerary.selectRoute(newRoute);
        }
    }
}
