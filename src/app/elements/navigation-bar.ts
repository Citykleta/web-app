import {html, LitElement} from 'lit-element';
import {ServiceRegistry} from '../services/service-registry';
import {ToolType} from '../tools/interfaces';
import {NavigationService} from '../services/navigation';
import {classMap} from 'lit-html/directives/class-map';

const navigationItem = (navigation: NavigationService, selectedTool) =>
    ({label, type}: { label: string, type: ToolType }) =>
        html`<li class="${classMap({active: type === selectedTool})}" @click="${() => navigation.selectTool(type)}">
                ${label}
            </li>`;

const navigationDefinition = [{
    label: 'Search',
    type: ToolType.SEARCH
}, {
    label: 'Itinerary',
    type: ToolType.ITINERARY
}, {
    label: 'Settings',
    type: ToolType.SETTINGS
}];

export const template = ({navigation, selectedTool}) => html`
<link rel="stylesheet" href="navigation-bar.css">
<ul>${navigationDefinition.map(navigationItem(navigation, selectedTool))}</ul>`;

export class NavigationBar extends LitElement {

    static get properties() {
        return {
            selectedTool: {type: String, attribute:'selected-tool', reflect:true}
        };
    }

    selectedTool: ToolType = null;
    private navigation: NavigationService;

    constructor({navigation}: ServiceRegistry) {
        super();
        this.navigation = navigation;
    }

    render() {
        return template({navigation: this.navigation, selectedTool: this.selectedTool});
    }
}

