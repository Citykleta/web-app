import {html, LitElement} from 'lit-element';
import {style} from './leisure-panel.style';
import {LeisureService} from '../service';
import {ServiceRegistry} from '../../common/service-registry';
import {LeisureRoute} from '../reducer';
import {loadingIndicator} from '../../common/elements/icons';
import {style as listBoxStyle} from '../../common/elements/listbox.style';
import {style as panelContentStyle} from '../../common/elements/panel-content.style';

export const template = ({leisure, isSearching, routes, selectedStopIndex, selectedRouteId}) => {
    if (isSearching) {
        return html`<div>${loadingIndicator()}</div>`;
    } else {
        const selectedRoute = routes.find(r => r.id === selectedRouteId);
        const selectedRouteIndex = routes.indexOf(selectedRoute);
        const selectRoute = ev => {
            leisure.selectRoute(routes[ev.selectedIndex].id);
        };

        return html`
<div>
    <h2 id="routes-of-interest">Routes of interest</h2>
    <citykleta-listbox aria-labelledby="routes-of-interest" @change="${selectRoute}">
        ${routes.map((r, i) => {
            return html`
        <citykleta-listbox-option ?selected=${i === 0} .selectedIndex="${selectedRouteIndex}" id="_route_listbox_${i}">
            <div>
                <h3>${r.title}</h3>
                <p>${r.description}</p>
            </div>
        </citykleta-listbox-option>`;
        })}
    </citykleta-listbox>
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
        return [style, panelContentStyle, listBoxStyle];
    }

    static get properties() {
        return propDef;
    }

    connectedCallback(): void {
        super.connectedCallback();
        this._leisure.searchRoutes();
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
}

