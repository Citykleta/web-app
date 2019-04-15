import {html, LitElement} from 'lit-element';
import {UIPointOrPlaceholder} from '../reducers/itinerary';
import {dragHandle, pin, remove as removeIcon} from './icons';
import {ServiceRegistry} from '../services/service-registry';
import {ItineraryService} from '../services/itinerary';
import {UIPoint} from '../utils';
import {SearchService} from '../services/search';
import {style} from './stop-point.style';

export const template = ({location: val, onSelect, onValue, remove}) => html`
    <span draggable="true" class="drag-handle">
        ${dragHandle()}
    </span>
    <citykleta-search-box @selection-change="${onSelect}" @value-change="${onValue}" class="overlay" .value="${val}"></citykleta-search-box>
    <citykleta-button-icon @click="${remove}" class="danger" id="remove-button">${removeIcon()}</citykleta-button-icon>
    `;

export const propDef = {
    location: {
        type: Object
    }
};

export class StopPoint extends LitElement {

    private _itinerary: ItineraryService = null;
    private _search: SearchService = null;
    location: UIPointOrPlaceholder = null;

    static get styles() {
        return style;
    }

    static get properties() {
        return propDef;
    }

    constructor({itinerary, search}: ServiceRegistry) {
        super();
        this._itinerary = itinerary;
        this._search = search;
    }

    render() {
        // overwrite suggestion id with actual stop point id
        const onValue = (ev: CustomEvent<{ value: UIPoint }>) => {
            this._itinerary.updatePoint(this.location.id, Object.assign({}, ev.detail.value, {id: this.location.id}));
        };

        const onSelect = (ev: CustomEvent<{ suggestion: UIPoint }>) => {
            this._search.selectSuggestion(ev.detail.suggestion);
        };

        const remove = () => this._itinerary.removePoint(this.location);

        return template({
            onValue,
            onSelect,
            location: this.location,
            remove
        });
    }
}

