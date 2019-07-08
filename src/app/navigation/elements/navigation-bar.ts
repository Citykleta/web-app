import {html, LitElement} from 'lit-element';
import {NavigationService} from '../../navigation/service';
import {classMap} from 'lit-html/directives/class-map';
import {style} from './navigation-bar.style';
import {View} from '../reducer';
import {ServiceRegistry} from '../../common/service-registry';

const navigationItem = (navigation: NavigationService) =>
    ({label, view}: { label: string, view: View }) =>
        html`<li class="${classMap({active: view === navigation.getView()})}" @click="${() => navigation.selectView(view)}">
                ${label}
            </li>`;

// todo typescript issue ?
type ViewDefinition = { label: 'string', view: View };
const navigationDefinition: ViewDefinition[] = [{
    // @ts-ignore
    label: 'Search',
    view: View.SEARCH
}, {
    // @ts-ignore
    label: 'Itinerary',
    view: View.ITINERARY
}, {
    // @ts-ignore
    label: 'Settings',
    view: View.SETTINGS
}];

export const template = ({navigation}) => html`<ul>${navigationDefinition.map(navigationItem(navigation))}</ul>`;

export const propsDef = {
    selectedView: {type: String, attribute: 'selected-view', reflect: true}
};


export class NavigationBar extends LitElement {

    private readonly _navigation: NavigationService;

    constructor(serviceMap: ServiceRegistry) {
        super();
        this._navigation = serviceMap.get('navigation');
    }

    static get styles() {
        return style;
    }

    static get properties() {
        return propsDef;
    }

    render() {
        return template({navigation: this._navigation});
    }
}

