import {html, LitElement} from 'lit-element';
import {ServiceRegistry} from '../services/service-registry';
import mapBoxConf from '../../conf/mapbox';
import mapboxgl from 'mapbox-gl';

export const template = () => html``;

export const propDef = {
    selectedTool: {
        type: String
    }
};

export class Map extends LitElement {

    private map;

    constructor(registry: ServiceRegistry) {
        super();
        const accessToken = mapBoxConf.token;
        const style = mapBoxConf.styleUrl;
        mapboxgl.accessToken = accessToken;
        this.map = new mapboxgl.Map({
            container: 'map-container',
            style,
            center: [-82.367408, 23.122419],
            zoom: 12.4
        });
    }

    render() {
        return template();
    }
}
