import {html} from 'lit-html';
import {LitElement} from 'lit-element';
import {ServiceRegistry} from '../../common/service-registry';
import {style} from './leisure-route-details.style';
import {LeisureService} from '../service';

export const template = ({stops, selectedStopIndex, selectStop}) => html`
<div>
    <h2>Itinerary details</h2>
    <ol tabindex="0">
    ${stops.map((s, i) => html`
        <li @click="${ev => selectStop(i)}" aria-selected="${i === selectedStopIndex}">
            <article>
                <h3>${s.name}</h3>
                <p>${s.description}</p>
            </article>
        </li>`)}
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
        return style;
    }

    constructor(registry: ServiceRegistry) {
        super();
        this._leisure = registry.get('leisure');
        this.addEventListener('keydown', this._handleKeyDown.bind(this));
    }

    _handleKeyDown(ev) {
        const {key} = ev;
        const routeLength = this.stops.length;
        if (routeLength) {
            const selectedStopIndex = this.selectedStopIndex;
            let newStopIndex = selectedStopIndex;
            switch (key) {
                case 'ArrowDown': {
                    newStopIndex = (selectedStopIndex + 1) % routeLength;
                    break;
                }
                case 'ArrowUp': {
                    newStopIndex = selectedStopIndex - 1 >= 0 ? selectedStopIndex - 1 : routeLength - 1;
                    break;
                }
            }
            this._leisure.selectStop(newStopIndex);
        }
        ev.stopPropagation();
    }

    render() {

        const selectStop = index => this._leisure.selectStop(index);

        return template({stops: this.stops, selectedStopIndex: this.selectedStopIndex, selectStop});
    }

}