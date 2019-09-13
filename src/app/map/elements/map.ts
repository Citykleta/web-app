import {ServiceRegistry} from '../../common/service-registry';
import {MapService} from '../service';

const template = document.createElement('template');
template.innerHTML = `<style>#map-container{width:100%;height:100%;}::slotted(*){position: absolute;display:flex;align-items:center;justify-content:center;width:100%;height:100%;z-index:3}</style><slot></slot><div id="map-container"></div>`;

// todo this component should toggle splashscreen/placeholder when map get loaded etc
export class GeoMap extends HTMLElement {

    private readonly _map: MapService;

    constructor(serviceRegistry: ServiceRegistry) {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this._map = serviceRegistry.get('map');
    }

    private _isLoading = true;

    get isLoading() {
        return this._isLoading;
    }

    set isLoading(value) {
        this.shadowRoot
            .querySelector('slot')
            .setAttribute('hidden', '');
    }

    connectedCallback(): void {
        const map = this._map;
        const container = this.shadowRoot.getElementById('map-container');
        map
            .boot({container, center: map.getCenter(), zoom: map.getZoom()})
            .onLoad(() => {
                this.isLoading = false;
            });
    }
}
