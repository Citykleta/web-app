import {html} from 'lit-html';
import mapboxconf from '../../../conf/mapbox';
import {LitElement} from 'lit-element';
import {ServiceRegistry} from '../../common/service-registry';
import {itineraryToGeoJSON, leisureToGeoJSON, suggestionsToGeoJSON} from '../utils';
import {factory} from '../tools/map-tool-box';
import {factory as canvasInteractions} from '../canvas-interactions';
import {View} from '../../navigation/reducer';
import {searchViewTool} from '../tools/search-tool';

const ACCESS_TOKEN = mapboxconf.accessToken;
const STYLE_URL = mapboxconf.style;

export const template = ({
                             zoom,
                             center,
                             suggestions,
                             itinerary,
                             leisure,
                             onCameraChange,
                             selectSuggestion,
                             selectItineraryRoute
                         }) => {
    return html`
<mb-map @click="${ev => console.log('map click')}" @camera-change="${onCameraChange}" center="${center.join(',')}" zoom="${zoom}" access-token="${ACCESS_TOKEN}" mb-style="${STYLE_URL}">
    <mb-geojson .data="${suggestions}" source-id="suggestions">
        <mb-circle-layer @click="${selectSuggestion}" layer-id="suggestions-point"
            filter="['==','$type','Point']"
            circle-color="#55B2FF" 
            circle-radius="8"
            circle-stroke-width="['case',['get','selected'],4,2]" 
            circle-stroke-color="['case',['get','selected'],'#55b2ff','#ff426f']" 
            circle-opacity="0.2"></mb-circle-layer>
        <mb-line-layer  @click="${selectSuggestion}" layer-id="suggestions-line"
            line-color="['case',['get','selected'],'#55b2ff','#ff426f']"
            line-opacity="0.7"
            line-gap-width="['case',['get','selected'],4,1]"
            line-width="['case',['get','selected'],7,5]"></mb-line-layer>
    </mb-geojson>
    <mb-geojson .data="${leisure}" source-id="leisure">
        <mb-circle-layer  layer-id="leisure-point"
            filter="['==','$type','Point']"
            circle-color="green"
            circle-radius="8"
            circle-stroke-width="2"
            circle-stroke-color="green"
            circle-opacity="0.2"></mb-circle-layer>
        <mb-line-layer  layer-id="leisure-line"
            line-color="green"
            line-opacity="1"
            line-width="5"></mb-line-layer>
        <mb-symbol-layer  layer-id="leisure-label"
            filter="['==','$type','Point']"
            text-size="18"
            text-offset="[0, -0.4]"
            text-anchor="bottom"
            text-font="['Open Sans Bold']"
            text-field="['get', 'name']"
            text-color="blue"></mb-symbol-layer>
    </mb-geojson>
    <mb-geojson .data="${itinerary}" source-id="itinerary">
        <mb-line-layer @click="${selectItineraryRoute}" layer-id="itinerary-line"
            line-color="['case',['get','selected'],'#ff426f','gray']"
            line-opacity="['case',['get','selected'],1,0.6]"
            line-gap-width="['case',['get','selected'],2,0]"
            line-width="['case',['get','selected'],3,5]"></mb-line-layer>
        <mb-circle-layer source="itinerary" layer-id="itinerary-point"
            filter="['==','$type','Point']"
            circle-color="#ff426f"
            circle-radius="8"
            circle-stroke-width="2"
            circle-stroke-color="#ff426f"
            circle-opacity="0.2"></mb-circle-layer>
    </mb-geojson>
</mb-map>`;
};

export const propDef = {
    center: {type: Array, reflect: true},
    zoom: {type: Number, reflect: true},
    view: {type: String, reflect: true},
    applicationState: {type: Object}
};

export class GeoMap extends LitElement {

    private readonly _toolBox;
    private readonly _registry;
    private _canvas;
    private zoom;
    private center;
    private applicationState;

    static get properties() {
        return propDef;
    }

    constructor(registy: ServiceRegistry) {
        super();
        this._registry = registy;
        this._toolBox = factory();
        this._toolBox.addTool(View.SEARCH, searchViewTool(registy));
    }

    attributeChangedCallback(name: string, old: string | null, value: string | null): void {
        super.attributeChangedCallback(name, old, value);
        if (name === 'view') {
            console.log('change tool');
            this._toolBox.selectTool(value);
        }
    }

    protected firstUpdated(_changedProperties: Map<PropertyKey, unknown>): void {
        // this._canvas = canvasInteractions(this.shadowRoot.querySelector('mb-map'));
        // this._canvas.onClick(ev => this._toolBox.clickAction(ev));
        // this._canvas.onLongClick(ev => this._toolBox.longClickAction(ev));
    }

    render() {

        const selectSuggestion = ev => {
            console.log('click layer');

            const {features} = ev;
            const search = this._registry.get('search');
            if (features && features.length) {
                const {properties: {index}} = features[0];
                search.selectSearchResult(this.applicationState.search.searchResult[index]);
                ev.preventDefault();
            }
        };

        const selectItineraryRoute = ev => {
            const {features} = ev;
            const itinerary = this._registry.get('itinerary');
            if (features && features.length) {
                const {properties: {index}} = features[0];
                itinerary.selectRoute(index);
                ev.preventDefault();
            }
        };

        const onCameraChange = ev => this._registry.get('map').updateCamera({
            zoom: ev.detail.zoom,
            center: ev.detail.center
        });

        console.log('render');

        return template({
            zoom: this.zoom,
            center: this.center,
            suggestions: suggestionsToGeoJSON(this.applicationState),
            itinerary: itineraryToGeoJSON(this.applicationState),
            leisure: leisureToGeoJSON(this.applicationState),
            onCameraChange,
            selectSuggestion,
            selectItineraryRoute
        });
    }
}
