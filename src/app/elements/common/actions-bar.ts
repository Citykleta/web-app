import {html, LitElement} from 'lit-element';
import {style} from './action-bar.style';
import {SearchResult} from '../../utils';
import {ServiceRegistry} from '../../services/service-registry';
import {ItineraryService} from '../../services/itinerary';
import {NavigationService} from '../../services/navigation';
import {ToolType} from '../../tools/interfaces';

export const propDef = {
    location: {
        type: Object
    }
};

export const template = ({goTo, goFrom}) => {
    return html`<ul>
<li><citykleta-button-icon @click="${goTo}">Go To</citykleta-button-icon></li>
<li><citykleta-button-icon @click="${goFrom}">Go From</citykleta-button-icon></li>
<li><citykleta-button-icon @click="${() => console.warn('not implemented')}">Save</citykleta-button-icon></li>
</ul>`;
};

export class ActionsBar extends LitElement {

    private location: SearchResult = null;
    private _itinerary: ItineraryService = null;
    private _navigation: NavigationService = null;

    constructor({itinerary, navigation}: ServiceRegistry) {
        super();
        this._itinerary = itinerary;
        this._navigation = navigation;
    }

    static get styles() {
        return style;
    }

    render() {
        const goTo = () => {
            this._itinerary.goTo(this.location);
            this._navigation.selectTool(ToolType.ITINERARY);
        };
        const goFrom = () => {
            this._itinerary.goFrom(this.location);
            this._navigation.selectTool(ToolType.ITINERARY);
        };

        return template({
            goTo,
            goFrom
        });
    }
}
