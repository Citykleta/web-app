import {html, LitElement} from 'lit-element';
import {classMap} from 'lit-html/directives/class-map';
import {ItineraryService} from '../service';
import {plus, remove, swap} from '../../common/elements/icons';
import {style} from './itinerary-panel.style';
import {style as panelContentStyle} from '../../common/elements/panel-content.style';
import {ItineraryPoint, Route} from '../../utils';
import {ServiceRegistry} from '../../common/service-registry';

const isTopPart = (ev: DragEvent, rect: ClientRect) => ev.pageY < (rect.top + rect.height / 2);

// todo better event handler for drag/drop operation
export const template = ({stops, routes, selectedRoute, itinerary}) => {
    let boundingBox = null;
    const addPoint = () => itinerary.addPoint(null);
    const reset = () => itinerary.reset();

    const dragstart = (id: number) => (ev: DragEvent) => {
        ev.dataTransfer.setData('text/json', String(id));
        ev.dataTransfer.dropEffect = 'move';
        itinerary.startMove(id);
    };

    const dragOver = (id: number) => (ev: DragEvent) => {
        ev.preventDefault();
        const li = (<HTMLLIElement>ev.currentTarget);
        boundingBox = li.getBoundingClientRect();
        const isBefore = isTopPart(ev, boundingBox);
        li.classList.toggle('drop-target-before', isBefore);
        li.classList.toggle('drop-target-after', !isBefore);
    };

    const drop = (id: number) => (ev: DragEvent) => {
        ev.preventDefault();
        if (isTopPart(ev, boundingBox)) {
            itinerary.moveBefore(id);
        } else {
            itinerary.moveAfter(id);
        }
        const li = (<HTMLLIElement>ev.currentTarget);
        li.classList.remove('drop-target-before');
        li.classList.remove('drop-target-after');
    };

    const dragLeave = (id: number) => (ev: DragEvent) => {
        ev.preventDefault();
        const li = (<HTMLLIElement>ev.currentTarget);
        li.classList.remove('drop-target-before');
        li.classList.remove('drop-target-after');
    };

    const isMulti = stops.length > 2;
    const swapPoints = () => {
        const [first, second] = stops;
        itinerary.startMove(second.id);
        itinerary.moveBefore(first.id);
    };
    const classList = classMap({
        removable: isMulti
    });

    return html`
<div>
    <div id="stops-list-container">
        <citykleta-button-icon label="swap departure with destination" @click="${swapPoints}" id="swap-button" class="${classMap({
        hidden: isMulti
    })}">${swap()}</citykleta-button-icon>
        <ol>${stops.map(stop => html`<li @dragstart="${dragstart(stop.id)}" @dragover="${dragOver(stop.id)}" @drop="${drop(stop.id)}" @dragleave="${dragLeave(stop.id)}"><citykleta-stop-point class=${classList} .location="${stop}"></citykleta-stop-point></li>`)}</ol>
    </div>
    <div id="action-buttons-container">
        <citykleta-button-icon label="add a stop point in the itinerary" @click="${addPoint}">${plus()}</citykleta-button-icon>
        <citykleta-button-icon label="reset itinerary selection" @click="${reset}">${remove()}</citykleta-button-icon>
    </div>
</div>
${routes.length ? html`<div id="routes-container">
<h2 id="route-suggestions">Route suggestions</h2>
<citykleta-route-details .selectedRoute="${selectedRoute}" .routes="${routes}">Hello world</citykleta-route-details></div>` : ''}`;
};

export const propDef = {
    stops: {type: Array},
    routes: {type: Array},
    selectedRoute: {type: Number}
};

export class ItineraryPanel extends LitElement {

    private selectedRoute: number;
    private stops: ItineraryPoint[];
    private routes: Route[];
    private readonly _itinerary: ItineraryService = null;

    constructor(serviceMap: ServiceRegistry) {
        super();
        this._itinerary = serviceMap.get('itinerary');
    }

    static get styles() {
        return [style, panelContentStyle];
    }

    static get properties() {
        return propDef;
    }

    render() {
        return template({
            routes: this.routes,
            stops: this.stops,
            itinerary: this._itinerary,
            selectedRoute: this.selectedRoute
        });
    }
}
