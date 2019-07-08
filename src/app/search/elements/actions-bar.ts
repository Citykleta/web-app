import {html, LitElement} from 'lit-element';
import {style} from './action-bar.style';
import {SearchResult} from '../../utils';
import {ItineraryService} from '../../itinerary/module';
import {NavigationService, View} from '../../navigation/module';
import {ServiceRegistry} from '../../common/service-registry';

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
    private readonly _itinerary: ItineraryService;
    private readonly _navigation: NavigationService;

    constructor(registry: ServiceRegistry) {
        super();
        this._itinerary = registry.get('itinerary');
        this._navigation = registry.get('navigation');
    }

    static get styles() {
        return style;
    }

    render() {
        const goTo = () => {
            this._itinerary.goTo(this.location);
            this._navigation.selectView(View.ITINERARY);
        };
        const goFrom = () => {
            this._itinerary.goFrom(this.location);
            this._navigation.selectView(View.ITINERARY);
        };

        return template({
            goTo,
            goFrom
        });
    }
}
