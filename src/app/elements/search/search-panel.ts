import {html, LitElement} from 'lit-element';
import {SearchResult} from '../../utils';
import {classMap} from 'lit-html/directives/class-map';
import {style} from './search-panel.style';
import {ServiceRegistry} from '../../services/service-registry';
import {SearchService} from '../../services/search';

export const template = ({selectedSearchResult, isSearching, searchResult, onValue}) => {
    return html`
    <citykleta-search-box id="search-box" .isBusy="${isSearching}" .suggestions="${searchResult}" .selectedSuggestion="${selectedSearchResult}" @value-change="${onValue}"></citykleta-search-box>
    <citykleta-location .location="${selectedSearchResult}" class="${classMap({hidden: selectedSearchResult === null})}"></citykleta-location>
`;
};

export const propDef = {
    searchResult: {type: Array},
    selectedSearchResult: {type: Object},
    isSearching: {type: Boolean}
};

export class SearchPanel extends LitElement {

    private isSearching = false;
    private selectedSearchResult: SearchResult = null;
    private searchResult: SearchResult[] = [];
    private readonly _search: SearchService = null;

    constructor({search}: ServiceRegistry) {
        super();
        this._search = search;
    }

    static get styles() {
        return style;
    }

    static get properties() {
        return propDef;
    }

    render() {
        return template({
            isSearching: this.isSearching,
            searchResult: this.searchResult,
            selectedSearchResult: this.selectedSearchResult,
            onValue: (ev: CustomEvent<{ value: SearchResult }>) => {
                this._search.selectSearchResult(ev.detail.value);
            }
        });
    }
}

