import {html} from 'lit-html';
import {LitElement} from 'lit-element';
import {ServiceRegistry} from '../../common/service-registry';
import {style} from './leisure-route-details.style';
import {style as listBoxStyle} from '../../common/elements/listbox.style';
import {LeisureService} from '../service';

export const template = ({stops, selectedStopIndex, selectStop}) => html`
<div>
    <h2 id="stop_points_label">Itinerary details</h2>
    <citykleta-listbox aria-labelledby="stop_points_label" .selectedIndex="${selectedStopIndex}" @change="${selectStop}">
    ${stops.map((s, i) => html`
        <citykleta-listbox-option ?selected=${i === 0} id="_leisure_stop_${i}">
            <div>
               <h3>${s.name}</h3>
                <p>${s.description}</p>
            </div>
        </citykleta-listbox-option>`)}
    </ol>
</div>
`;

export const propDef = {
    stops: {type: Array},
    selectedStopIndex: {type: Number}
};

export class LeisureRouteDetails extends LitElement {
    private stops: any[];
    private selectedStopIndex: number;
    private _leisure: LeisureService;

    static get properties() {
        return propDef;
    }

    static get styles() {
        return [style, listBoxStyle];
    }

    constructor(registry: ServiceRegistry) {
        super();
        this._leisure = registry.get('leisure');
    }

    render() {
        const selectStop = ev => this._leisure.selectStop(ev.selectedIndex);
        return template({stops: this.stops, selectedStopIndex: this.selectedStopIndex, selectStop});
    }

}