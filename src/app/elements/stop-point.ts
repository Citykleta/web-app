import {html, LitElement} from 'lit-element';
import {UIPointOrPlaceholder} from '../reducers/itinerary';
import {pin} from './icons';
import {ServiceRegistry} from '../services/service-registry';
import {ItineraryService} from '../services/itinerary';

export const template = ({location: val, onValue, remove}) => {
    return html`
    <link rel="stylesheet" href="stop-point.css">
    <span draggable="true" class="drag-handle">
        ${pin()}
    </span>
    <citykleta-search-box @value-change="${onValue}" class="overlay" .value="${val}"></citykleta-search-box>
    <button @click="${remove}" id="remove-button">X</button>
    `;
};

export const propDef = {
    location: {
        type: Object
    }
};

export class StopPoint extends LitElement {

    private _itinerary: ItineraryService = null;
    location: UIPointOrPlaceholder = null;

    static get properties() {
        return propDef;
    }

    constructor({itinerary}: ServiceRegistry) {
        super();
        this._itinerary = itinerary;
    }

    render() {
        // overwrite suggestion id with actual stop point id
        const onValue = (ev) => {
            this._itinerary.updatePoint(this.location.id, Object.assign({}, ev.detail.value, {id: this.location.id}));
        };

        const remove = () => this._itinerary.removePoint(this.location);

        return template({
            onValue,
            location: this.location,
            remove
        });
    }
}

