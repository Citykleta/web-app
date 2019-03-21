import {html, LitElement} from 'lit-element';
import {ServiceRegistry} from '../services/service-registry';
import {GeoLocation, stringify} from '../util';
import {classMap} from 'lit-html/directives/class-map';
import {SearchService} from '../services/search';

export const template = ({selectedSuggestion, search}) => {
    return html`
<link rel="stylesheet" href="search-panel.css">
    <citykleta-search-box @selection-change="${ev => search.selectSuggestion(ev.detail.suggestion)}"></citykleta-search-box>
    <citykleta-location .location="${selectedSuggestion}" class="${classMap({hidden: selectedSuggestion === null})}"></citykleta-location>
`;
};

export const propDef = {
    selectedSuggestion: {type: Object}
};


export class SearchPanel extends LitElement {

    static get properties() {
        return propDef;
    }

    private selectedSuggestion: GeoLocation = null;
    private search: SearchService = null;

    constructor({search}: ServiceRegistry) {
        super();
        this.search = search;
    }

    render() {
        return template({selectedSuggestion: this.selectedSuggestion, search: this.search});
    }
}

