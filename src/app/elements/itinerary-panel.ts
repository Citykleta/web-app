import {html, LitElement} from 'lit-element';
import {ServiceRegistry} from '../services/service-registry';
import {UIPointOrPlaceholder} from '../reducers/itinerary';
import {classMap} from 'lit-html/directives/class-map';
import {ItineraryService} from '../services/itinerary';

const isTopPart = (ev: DragEvent, rect: ClientRect) => ev.pageY < (rect.top + rect.height / 2);

// todo better event handler for drag/drop operation
export const template = ({stops, addPoint, itinerary}) => {

    let boundingBox = null;

    const dragstart = (p: UIPointOrPlaceholder) => (ev: DragEvent) => {
        ev.dataTransfer.setData('text/json', JSON.stringify(p));
        ev.dataTransfer.dropEffect = 'move';
        itinerary.startMove(p);
    };

    const dragOver = (p: UIPointOrPlaceholder) => (ev: DragEvent) => {
        ev.preventDefault();
        const li = (<HTMLLIElement>ev.currentTarget);
        boundingBox = li.getBoundingClientRect();
        const isBefore = isTopPart(ev, boundingBox);
        li.classList.toggle('drop-target-before', isBefore);
        li.classList.toggle('drop-target-after', !isBefore);
    };

    const drop = (p: UIPointOrPlaceholder) => (ev: DragEvent) => {
        ev.preventDefault();
        if (isTopPart(ev, boundingBox)) {
            itinerary.moveBefore(p);
        } else {
            itinerary.moveAfter(p);
        }
        const li = (<HTMLLIElement>ev.currentTarget);
        li.classList.remove('drop-target-before');
        li.classList.remove('drop-target-after');
    };

    const dragLeave = (p: UIPointOrPlaceholder) => (ev: DragEvent) => {
        ev.preventDefault();
        const li = (<HTMLLIElement>ev.currentTarget);
        li.classList.remove('drop-target-before');
        li.classList.remove('drop-target-after');
    };

    const classList = classMap({
        removable: stops.length > 2
    });
    return html`<link rel="stylesheet" href="itinerary-panel.css">
<ol>${stops.map((stop) => html`<li @dragstart="${dragstart(stop)}" @dragover="${dragOver(stop)}" @drop="${drop(stop)}" @dragleave="${dragLeave(stop)}"><citykleta-stop-point class=${classList} .value="${stop}" .location="${stop}"></citykleta-stop-point></li>`)}</ol>
<div><button @click="${addPoint}">+</button></div>`;
};

export const propDef = {
    stops: {type: Array}
};

export class ItineraryPanel extends LitElement {

    private stops: UIPointOrPlaceholder[];

    static get properties() {
        return propDef;
    }

    private _itinerary: ItineraryService = null;

    constructor({itinerary, store}: ServiceRegistry) {
        super();
        this._itinerary = itinerary;
    }

    render() {
        return template({
            stops: this.stops, addPoint: () => {
                this._itinerary.addPoint(null);
            },
            itinerary: this._itinerary
        });
    }
}
