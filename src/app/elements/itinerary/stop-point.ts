import {html, LitElement} from 'lit-element';
import {dragHandle, remove as removeIcon} from '../common/icons';
import {ServiceRegistry} from '../../services/service-registry';
import {ItineraryService} from '../../services/itinerary';
import {SearchService} from '../../services/search';
import {style} from './stop-point.style';
import {ItineraryPoint, SearchResult} from '../../utils';

export const template = ({location: val, onValue, remove}) => html`
    <span draggable="true" class="drag-handle">
        ${dragHandle()}
    </span>
    <citykleta-search-box @value-change="${onValue}" .value="${val.item}"></citykleta-search-box>
    <citykleta-button-icon label="remove stop point from the itinerary" @click="${remove}" class="danger" id="remove-button">${removeIcon()}</citykleta-button-icon>
    `;

export const propDef = {
    location: {
        type: Object
    }
};

export class StopPoint extends LitElement {

    location: ItineraryPoint = null;
    private _itinerary: ItineraryService = null;
    private _search: SearchService = null;

    constructor({itinerary, search}: ServiceRegistry) {
        super();
        this._itinerary = itinerary;
        this._search = search;
    }

    static get styles() {
        return style;
    }

    static get properties() {
        return propDef;
    }

    render() {
        // overwrite suggestion sourceId with actual stop point sourceId
        const onValue = (ev: CustomEvent<{ value: SearchResult }>) => {
            this._itinerary.updatePoint(this.location.id, ev.detail.value);
        };

        const remove = () => this._itinerary.removePoint(this.location.id);

        return template({
            onValue,
            location: this.location,
            remove
        });
    }
}

