import {html, LitElement} from 'lit-element';
import {Route} from '../../utils';
import {ItineraryService} from '../service';
import {ServiceRegistry} from '../../common/service-registry';
import {style} from './route-details.style';

export const formatDuration = (duration: number) => duration > 60 ? html`${Math.floor(duration / 60)}<span class="unit">min</span>${Math.round(duration % 60)}<span class="unit">sec</span>` : html`${duration}<span class="unit">sec</span>`;

export const formatDistance = (distance: number) => html`${Math.round(distance)}<span class="unit">m</span>`;

export const template = ({routes, selectedRoute}) => html`<ol>${routes.map( (r, i) => html`<li aria-selected="${i === selectedRoute}">
<dl>
    <dt>Distance</dt><dd>${formatDistance(r.distance)}</dd>
    <dt>Duration</dt><dd>${formatDuration(r.duration)}</dd>
</dl>
</li>`)}</ol>`;

export const propDef = {
    routes: {type: Array},
    selectedRoute:{type:Number}
};

export class RouteDetails extends LitElement {

    private routes: Route[];
    private selectedRoute: number;
    private readonly _itinerary: ItineraryService;

    constructor(serviceMap: ServiceRegistry) {
        super();
        this._itinerary = serviceMap.get('itinerary');
    }

    static get properties() {
        return propDef;
    }

    static get styles() {
        return style;
    }

    render() {
        return template({routes: this.routes, selectedRoute:this.selectedRoute});
    }
}
