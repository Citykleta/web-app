import {html, LitElement} from 'lit-element';
import {style} from './app.style';
import {Theme} from './settings/module';
import {View} from './navigation/reducer';
import {ServiceRegistry} from './common/service-registry';

export const propsDef = {
    selectedView: {type: String, attribute: 'view', reflect: true}
};

const viewList = [View.SEARCH, View.ITINERARY, View.LEISURE, View.SETTINGS];

const viewToTabIndex = (view) => viewList.indexOf(view);

const tabIndexToView = (index) => viewList[index];

export const template = ({selectedView, onTabChange}) => {
    const index = viewToTabIndex(selectedView);
    return html`
<citykleta-tabset @change="${onTabChange}" selected-tab-index="${index}">
    <citykleta-tab ?selected=${index === 0}>Search</citykleta-tab>
    <citykleta-tab ?selected=${index === 1}>Itinerary</citykleta-tab>
    <citykleta-tab ?selected=${index === 2}>Leisure</citykleta-tab>
    <citykleta-tab ?selected=${index === 3}>Settings</citykleta-tab>
    <citykleta-tabpanel>
        <app-search-panel .selectedView="${selectedView}"></app-search-panel>
    </citykleta-tabpanel>
    <citykleta-tabpanel>
        <app-itinerary-panel .selectedView="${selectedView}"></app-itinerary-panel>
    </citykleta-tabpanel>
    <citykleta-tabpanel>
        <app-leisure-panel .selectedView="${selectedView}"></app-leisure-panel>
    </citykleta-tabpanel>
    <citykleta-tabpanel>
        <app-settings-panel .selectedView="${selectedView}"></app-settings-panel
    </citykleta-tabpanel>
</citykleta-tabset>`;
};

export class App extends LitElement {

    private selectedView;
    private _navigation;

    constructor(registry: ServiceRegistry) {
        super();
        this._navigation = registry.get('navigation');
    }

    static get styles() {
        return style;
    }

    static get properties() {
        return propsDef;
    }

    set theme(this: HTMLElement, val) {
        this.classList.toggle('dark', val === Theme.DARK);
    }

    render() {
        const onTabChange = ({selectedIndex}) => {
            if (selectedIndex >= 0 && selectedIndex < viewList.length) {
                this._navigation.selectView(tabIndexToView(selectedIndex));
            }
        };
        return template({selectedView: this.selectedView, onTabChange});
    }
}
