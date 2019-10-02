import {html, LitElement} from 'lit-element';
import {style} from './leisure-panel.style';
import {LeisureService} from '../service';
import {ServiceRegistry} from '../../common/service-registry';
import {LeisureRoute} from '../reducer';
import {loadingIndicator} from '../../common/elements/icons';

export const template = ({leisure, isSearching, routes, selectedStopIndex, selectedRouteId}) => {
    if (isSearching) {
        return html`<div>${loadingIndicator()}</div>`;
    } else {
        const selectedRoute = routes.find(r => r.id === selectedRouteId);
        return html`<div>
    <ul tabindex="0">
    ${routes.map(r => html`
        <li @click=${() => leisure.selectRoute(r.id)} aria-selected="${r.id === selectedRouteId}">
        <article>
            <h2>${r.title}</h2>
            <p>${r.description}</p>
        </article>
        </li>`)}
    </ul>
</div>
${selectedRoute !== void 0 ? html`<citykleta-leisure-route-details .selectedStopIndex=${selectedStopIndex} .stops="${selectedRoute.stops}"></citykleta-leisure-route-details>` : ''}
`;
    }
};

export const propDef = {
    isSearching: {type: Boolean},
    routes: {type: Array},
    selectedRouteId: {type: Number},
    selectedStopIndex: {type: Number}
};

// todo refactor with equivalent Listbox
export class LeisurePanel extends LitElement {

    private isSearching = false;
    private selectedRouteId: number = null;
    private selectedStopIndex: number = null;
    private routes: LeisureRoute[] = [];
    private readonly _leisure: LeisureService = null;

    constructor(serviceRegistry: ServiceRegistry) {
        super();
        this._leisure = serviceRegistry.get('leisure');
    }

    static get styles() {
        return style;
    }

    static get properties() {
        return propDef;
    }

    connectedCallback(): void {
        super.connectedCallback();
        this._leisure.searchRoutes();
        this.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    render() {
        return template({
            leisure: this._leisure,
            isSearching: this.isSearching,
            selectedRouteId: this.selectedRouteId,
            routes: this.routes,
            selectedStopIndex: this.selectedStopIndex
        });
    }

    private handleKeyDown(ev) {
        const {key} = ev;
        const routeLength = this.routes.length;
        const currentIndex = this.routes.findIndex(r => r.id === this.selectedRouteId);
        if (routeLength) {
            let newRouteIndex = currentIndex > -1 ? currentIndex : 0;
            switch (key) {
                case 'ArrowDown': {
                    newRouteIndex = (newRouteIndex + 1) % routeLength;
                    break;
                }
                case 'ArrowUp': {
                    newRouteIndex = (newRouteIndex - 1) >= 0 ? newRouteIndex - 1 : routeLength - 1;
                    break;
                }
            }
            this._leisure.selectRoute(this.routes[newRouteIndex].id);
        }

    }

}

