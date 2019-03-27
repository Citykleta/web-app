import {html, LitElement} from 'lit-element';
import {ServiceRegistry} from '../services/service-registry';
import {UIPointOrPlaceholder} from '../reducers/itinerary';
import {classMap} from 'lit-html/directives/class-map';
import {ItineraryService} from '../services/itinerary';
import {plus, swap} from './icons';
import {UIPoint} from '../util';

const isTopPart = (ev: DragEvent, rect: ClientRect) => ev.pageY < (rect.top + rect.height / 2);


export const propDef = {
    stop: {type: Object}
};

export class ItineraryStopPoint extends LitElement {

    private stop: UIPointOrPlaceholder[];

    static get properties() {
        return propDef;
    }

    private _itinerary: ItineraryService = null;

    private handleDragStart(ev) {
    }

    private handleDragOver(ev) {
    }

    private handleDrop(ev) {
    }

    private handleDragLeave(ev) {
    }

    constructor({itinerary}: ServiceRegistry) {
        super();
        this._itinerary = itinerary;
    }

    render() {
        return html``;
    }
}
