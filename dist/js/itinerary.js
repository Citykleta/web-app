import { q as swap, t as plus, u as remove, v as dragHandle, c as connect, s as store } from './index-edf8c9d7.js';
export { I as InsertionPosition, w as addItineraryPoint, d as addItineraryPointWithSideEffects, e as changeItineraryPointWithSideEffects, E as defaultState, z as fetchRoutes, C as fetchRoutesFromAPI, B as fetchRoutesWithFailure, A as fetchRoutesWithSuccess, f as goFrom, g as goTo, D as moveItineraryPoint, m as moveItineraryPointWithSideEffects, k as reducer, x as removeItineraryPoint, r as removeItineraryPointWithSideEffects, h as resetRoutes, i as selectRoute, y as updateItineraryPoint } from './index-edf8c9d7.js';
import { e as css, L as LitElement, h as html, k as formatDistance, l as formatDuration, o as once } from './utils-4526794e.js';
import { c as classMap, l as loadSearchItineraryComponents } from './index-a4db3c48.js';
export { b as loadServices, t as provider } from './index-a4db3c48.js';

// language=CSS
const style = css `
    :host > div {
        background: var(--background-theme);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12),
        0 4px 4px rgba(0, 0, 0, 0.12),
        0 6px 4px rgba(0, 0, 0, 0.12);
    }

    ol {
        flex-grow: 1;
        list-style: none;
        margin: 0;
        padding: 0;
    }

    #action-buttons-container {
        display: flex;
        justify-content: center;
        padding: 0.5em;
    }

    #action-buttons-container > * {
        margin: 0 0.4em;
    }

    #stops-list-container {
        align-items: center;
        display: flex;
    }

    #swap-button {
        transform: rotateZ(90deg);
        margin: 0 0.5em;
    }

    li {
        --border-width: 14px;
        --offset: calc(-1 * var(--border-width));
        position: relative;
    }

    li.drop-target-before::before,
    li.drop-target-after::after {
        content: '';
        display: inline-block;
        border-width: var(--border-width);
        border-style: solid;
        border-color: transparent transparent transparent var(--color-theme-compl);
        z-index: 99;
        position: absolute;
    }

    li.drop-target-before::before {
        top: var(--offset);
    }

    li.drop-target-after::after {
        bottom: var(--offset);
    }

    .hidden {
        display: none;
    }

    #routes-container {
        margin-top: 1em;
        padding-bottom: 1em;
    }

    h2 {
        margin: 1em;
        border-bottom: 2px solid var(--color-theme);
    }
`;

const isTopPart = (ev, rect) => ev.pageY < (rect.top + rect.height / 2);
// todo better event handler for drag/drop operation
const template = ({ stops, routes, selectedRoute, itinerary }) => {
    let boundingBox = null;
    const addPoint = () => itinerary.addPoint(null);
    const reset = () => itinerary.reset();
    const dragstart = (id) => (ev) => {
        ev.dataTransfer.setData('text/json', String(id));
        ev.dataTransfer.dropEffect = 'move';
        itinerary.startMove(id);
    };
    const dragOver = (id) => (ev) => {
        ev.preventDefault();
        const li = ev.currentTarget;
        boundingBox = li.getBoundingClientRect();
        const isBefore = isTopPart(ev, boundingBox);
        li.classList.toggle('drop-target-before', isBefore);
        li.classList.toggle('drop-target-after', !isBefore);
    };
    const drop = (id) => (ev) => {
        ev.preventDefault();
        if (isTopPart(ev, boundingBox)) {
            itinerary.moveBefore(id);
        }
        else {
            itinerary.moveAfter(id);
        }
        const li = ev.currentTarget;
        li.classList.remove('drop-target-before');
        li.classList.remove('drop-target-after');
    };
    const dragLeave = (id) => (ev) => {
        ev.preventDefault();
        const li = ev.currentTarget;
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
    return html `
<div>
    <div id="stops-list-container">
        <citykleta-button-icon label="swap departure with destination" @click="${swapPoints}" id="swap-button" class="${classMap({
        hidden: isMulti
    })}">${swap()}</citykleta-button-icon>
        <ol>${stops.map(stop => html `<li @dragstart="${dragstart(stop.id)}" @dragover="${dragOver(stop.id)}" @drop="${drop(stop.id)}" @dragleave="${dragLeave(stop.id)}"><citykleta-stop-point class=${classList} .location="${stop}"></citykleta-stop-point></li>`)}</ol>
    </div>
    <div id="action-buttons-container">
        <citykleta-button-icon label="add a stop point in the itinerary" @click="${addPoint}">${plus()}</citykleta-button-icon>
        <citykleta-button-icon label="reset itinerary selection" @click="${reset}">${remove()}</citykleta-button-icon>
    </div>
</div>
${routes.length ? html `<div id="routes-container">
<h2>Route suggestions</h2>
<citykleta-route-details tabindex="0" .selectedRoute="${selectedRoute}" .routes="${routes}">Hello world</citykleta-route-details></div>` : ''}`;
};
const propDef = {
    stops: { type: Array },
    routes: { type: Array },
    selectedRoute: { type: Number }
};
class ItineraryPanel extends LitElement {
    constructor(serviceMap) {
        super();
        this._itinerary = null;
        this._itinerary = serviceMap.get('itinerary');
    }
    static get styles() {
        return style;
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

// language=CSS
const style$1 = css `:host {
    align-items: center;
    display: flex;
    justify-content: space-between;
}

:host(.removable) #remove-button {
    --size: 1.3rem;
}

:host(.removable) .drag-handle, :host(.removable) #remove-button {
    display: flex;
    margin: 0 0.5em;
}

#remove-button {
    display: none;
}

.drag-handle {
    display: none;
    width: 1rem;
    --color: var(--font-color-theme-1);
}

/**
todo display a drag area on host hover instead
 */
.drag-handle:hover {
    --color: var(--color-theme-compl);
    cursor: grab;
}

.drag-handle svg {
    fill: var(--color);
    stroke: var(--color);
}

citykleta-search-box {
    flex-grow: 1;
    margin: 0 0.5em;
}`;

const template$1 = ({ location: val, onValue, remove: remove$1 }) => html `
    <span draggable="true" class="drag-handle">
        ${dragHandle()}
    </span>
    <citykleta-search-box @value-change="${onValue}" .value="${val.item}"></citykleta-search-box>
    <citykleta-button-icon label="remove stop point from the itinerary" @click="${remove$1}" class="danger" id="remove-button">${remove()}</citykleta-button-icon>
    `;
const propDef$1 = {
    location: {
        type: Object
    }
};
class StopPoint extends LitElement {
    constructor(serviceMap) {
        super();
        this.location = null;
        this._itinerary = null;
        this._search = null;
        this._itinerary = serviceMap.get('itinerary');
        this._search = serviceMap.get('search');
    }
    static get styles() {
        return style$1;
    }
    static get properties() {
        return propDef$1;
    }
    render() {
        // overwrite suggestion sourceId with actual stop point sourceId
        const onValue = (ev) => {
            this._itinerary.updatePoint(this.location.id, ev.detail.value);
        };
        const remove = () => this._itinerary.removePoint(this.location.id);
        return template$1({
            onValue,
            location: this.location,
            remove
        });
    }
}

// language=CSS
const style$2 = css `
    :host {
        background: var(--background-theme);
        --route-bg-color: inherit;
        --route-color: inherit;
        --route-border-color: var(--background-theme-1);
    }

    ol {
        list-style: none;
        margin: 0;
        padding: 0;
        width: 100%;
    }

    li {
        padding: 0.5em 1em;
        background: var(--route-bg-color);
        color: var(--route-color);
        transition: background-color 0.3s, color 0.3s;
    }

    li[aria-selected=true] {
        --route-bg-color: var(--color-theme-1);
        --route-color: var(--font-color-theme-2);
    }

    li:not(:last-child) {
        border-bottom: 1px solid var(--route-border-color);
    }

    dl {
        display: grid;
        grid-template-columns: repeat(2, fit-content(100px));
        grid-row-gap: 0.25em;
    }

    dt {
        font-weight: bold;
    }

    dt::after {
        content: ':'
    }

    .unit {
        margin: 0 0.25em;
        font-style: italic;
        font-size: 0.9em;
    }
`;

const template$2 = ({ routes, selectedRoute, itinerary }) => html `<ol>${routes.map((r, i) => html `<li @click="${() => itinerary.selectRoute(i)}" aria-selected="${i === selectedRoute}">
<dl>
    <dt>Distance</dt><dd>${formatDistance(r.distance)}</dd>
    <dt>Duration</dt><dd>${formatDuration(r.duration)}</dd>
</dl>
</li>`)}</ol>`;
const propDef$2 = {
    routes: { type: Array },
    selectedRoute: { type: Number }
};
class RouteDetails extends LitElement {
    constructor(serviceMap) {
        super();
        this._itinerary = serviceMap.get('itinerary');
        this.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    static get properties() {
        return propDef$2;
    }
    static get styles() {
        return style$2;
    }
    render() {
        return template$2({
            routes: this.routes,
            selectedRoute: this.selectedRoute,
            itinerary: this._itinerary
        });
    }
    handleKeyDown(ev) {
        const { key } = ev;
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

const loadComponents = once((injector) => {
    const connectedItineraryPanel = connect(store, (state) => state.itinerary);
    loadSearchItineraryComponents(injector);
    customElements.define('citykleta-itinerary-panel', connectedItineraryPanel(injector(ItineraryPanel)));
    customElements.define('citykleta-stop-point', injector(StopPoint));
    customElements.define('citykleta-route-details', injector(RouteDetails));
});
const view = () => html `<citykleta-itinerary-panel class="panel"></citykleta-itinerary-panel>`;

export { ItineraryPanel, StopPoint, loadComponents, view };
//# sourceMappingURL=itinerary.js.map
